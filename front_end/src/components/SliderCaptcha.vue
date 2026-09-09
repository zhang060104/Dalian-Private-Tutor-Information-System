<script setup lang="ts">
/**
 * 真实后端滑块验证码
 *  - GET /api/captcha → {captchaId, background, puzzle}（base64 png）
 *  - 用户拖动拼块到背景缺口处松手 → POST /api/captcha/verify {captchaId, x}
 *    → 通过返回 {token}（5 分钟内有效、可重复使用）
 *
 * 缺口垂直 y 通过 canvas 扫描白色描边矩形定位（CaptchaVO 不返回 y）。
 * emit('success', token) 通知父组件持有 token，业务请求时携带 captchaToken。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import http from '@/api/http'

const emit = defineEmits<{
  (e: 'success', token: string): void
  (e: 'reset'): void
}>()

const props = defineProps<{ hint?: string }>()

const BG_W = 300
const BG_H = 150
const SIZE = 48

interface CaptchaVO {
  captchaId: string
  background: string
  puzzle: string
}

const captchaId = ref<string>('')
const backgroundImg = ref<string>('')
const puzzleImg = ref<string>('')
const holeX = ref(0)
const holeY = ref(0)
const puzzleLeft = ref(0)
const puzzleTop = ref(0)
const displayW = ref(BG_W)
const puzzleDispW = ref(SIZE) // 拼块显示宽度（px）
const trackWidth = ref(BG_W - SIZE)

const done = ref(false)
const dragging = ref(false)
const loading = ref(false)
const bgWrapEl = ref<HTMLElement | null>(null)
let startX = 0
let startLeft = 0
let pointerMoveHandler: ((e: PointerEvent) => void) | null = null
let pointerUpHandler: ((e: PointerEvent) => void) | null = null

async function fetchCaptcha() {
  loading.value = true
  done.value = false
  puzzleLeft.value = 0
  emit('reset')
  try {
    const vo = await http.get<CaptchaVO>('/api/captcha')
    captchaId.value = vo.captchaId
    backgroundImg.value = vo.background
    puzzleImg.value = vo.puzzle
    await detectHole(vo.background)
    puzzleTop.value = holeY.value
  } catch (e) {
    ElMessage.error((e as Error).message || '加载验证码失败')
  } finally {
    loading.value = false
  }
}

/** 在 background 图上扫描白色描边矩形（48×48）确定缺口左上 (x,y) */
async function detectHole(bgDataUrl: string) {
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('background image load failed'))
    img.src = bgDataUrl
  })
  const cvs = document.createElement('canvas')
  cvs.width = BG_W
  cvs.height = BG_H
  const ctx = cvs.getContext('2d')!
  ctx.drawImage(img, 0, 0, BG_W, BG_H)
  const data = ctx.getImageData(0, 0, BG_W, BG_H).data

  const isWhite = (i: number) => data[i] >= 250 && data[i + 1] >= 250 && data[i + 2] >= 250

  // 在所有候选位置中找白色描边得分最高的 48×48 矩形
  let best = { score: -1, x: 0, y: 0 }
  for (let y = 0; y <= BG_H - SIZE; y++) {
    for (let x = 0; x <= BG_W - SIZE; x++) {
      let score = 0
      for (let dx = 0; dx < SIZE; dx++) {
        const top = (y * BG_W + x + dx) * 4
        const bot = ((y + SIZE - 1) * BG_W + x + dx) * 4
        if (isWhite(top)) score++
        if (isWhite(bot)) score++
      }
      for (let dy = 0; dy < SIZE; dy++) {
        const left = ((y + dy) * BG_W + x) * 4
        const right = ((y + dy) * BG_W + x + SIZE - 1) * 4
        if (isWhite(left)) score++
        if (isWhite(right)) score++
      }
      if (score > best.score) best = { score, x, y }
    }
  }

  if (best.score >= 150) {
    holeX.value = best.x
    holeY.value = best.y
  } else {
    holeX.value = 0
    holeY.value = Math.floor((BG_H - SIZE) / 2)
  }
}

function onResize() {
  if (!bgWrapEl.value) return
  displayW.value = bgWrapEl.value.clientWidth
  puzzleDispW.value = Math.round((SIZE * displayW.value) / BG_W)
  trackWidth.value = Math.max(0, displayW.value - puzzleDispW.value)
  // 已成功则保留，否则按比例缩放当前 left
  puzzleLeft.value = Math.min(puzzleLeft.value, trackWidth.value)
}

function onPointerDown(e: PointerEvent) {
  if (done.value || loading.value || !captchaId.value) return
  dragging.value = true
  startX = e.clientX
  startLeft = puzzleLeft.value
  pointerMoveHandler = (ev: PointerEvent) => {
    if (!dragging.value) return
    const scale = displayW.value / BG_W
    let nx = startLeft + (ev.clientX - startX) / scale
    nx = Math.max(0, Math.min(trackWidth.value, nx))
    puzzleLeft.value = nx
  }
  pointerUpHandler = () => {
    dragging.value = false
    detach()
    // 松手即提交验证
    submitVerify()
  }
  window.addEventListener('pointermove', pointerMoveHandler)
  window.addEventListener('pointerup', pointerUpHandler)
  e.preventDefault()
}

function detach() {
  if (pointerMoveHandler) window.removeEventListener('pointermove', pointerMoveHandler)
  if (pointerUpHandler) window.removeEventListener('pointerup', pointerUpHandler)
  pointerMoveHandler = null
  pointerUpHandler = null
}

async function submitVerify() {
  if (done.value || !captchaId.value) return
  const x = Math.round(puzzleLeft.value)
  try {
    const res = await http.post<{ token: string }>('/api/captcha/verify', {
      captchaId: captchaId.value,
      x,
    })
    done.value = true
    dragging.value = false
    emit('success', res.token)
  } catch (e) {
    ElMessage.error((e as Error).message || '验证失败，请重试')
    fetchCaptcha()
  }
}

defineExpose({ refresh: fetchCaptcha })

onMounted(() => {
  fetchCaptcha()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  detach()
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="captcha" :class="{ done }">
    <div ref="bgWrapEl" class="bg-wrap">
      <img v-if="backgroundImg" :src="backgroundImg" alt="captcha background" class="bg" />
      <img
        v-if="puzzleImg"
        :src="puzzleImg"
        alt="captcha puzzle"
        class="puzzle"
        :style="{
          width: puzzleDispW + 'px',
          height: puzzleDispW + 'px',
          left: (puzzleLeft * displayW) / BG_W + 'px',
          top: (puzzleTop * displayW) / BG_W + 'px',
        }"
        @pointerdown="onPointerDown"
      />
      <div v-if="loading" class="loading">加载中...</div>
    </div>
    <div class="actions">
      <div class="track">
        <div class="fill" :style="{ width: ((puzzleLeft / Math.max(1, trackWidth)) * 100) + '%' }"></div>
        <span v-if="!done && !dragging" class="tip">{{ props.hint ?? '拖动拼块到缺口对齐后松开' }}</span>
        <span v-else-if="done" class="ok">✓ 验证通过</span>
        <span v-else class="tip">释放即提交</span>
      </div>
      <el-button v-if="!done" size="small" plain :loading="loading" @click="fetchCaptcha">换一张</el-button>
    </div>
  </div>
</template>

<style scoped>
.captcha {
  width: 100%;
}
.bg-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 300 / 150;
  background: #f4f7fb;
  border: 1px solid #d8dee8;
  border-radius: 6px;
  overflow: hidden;
  user-select: none;
}
.bg {
  width: 100%;
  height: 100%;
  display: block;
}
.puzzle {
  position: absolute;
  cursor: grab;
  touch-action: none;
}
.captcha.done .puzzle {
  cursor: default;
}
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a94a6;
  font-size: 13px;
  background: rgba(244, 247, 251, 0.7);
}
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}
.track {
  position: relative;
  height: 32px;
  border: 1px solid #d8dee8;
  border-radius: 4px;
  background: #f9fafd;
  overflow: hidden;
  flex: 1;
}
.fill {
  height: 100%;
  background: #d6e7ff;
  transition: width 0.08s;
}
.tip {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a94a6;
  font-size: 13px;
  pointer-events: none;
}
.ok {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1d9e75;
  font-size: 14px;
  font-weight: 500;
}
</style>