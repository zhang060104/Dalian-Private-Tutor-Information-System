<script setup lang="ts">
/**
 * 真实后端滑块验证码
 *  - GET /api/captcha → {captchaId, background, puzzle}（base64 png）
 *  - 用户拖动拼块到背景缺口处松手 → POST /api/captcha/verify {captchaId, x}
 *    → 通过返回 {token}（5 分钟内有效、可重复使用）
 *
 * 缺口定位：CaptchaVO 不返回坐标。但缺口轮廓在图上是一条封闭白描边，
 * 只需对整幅图做一次线性扫描，统计所有白色像素的包围盒即可得缺口左上角 (x,y)。
 * 复杂度 O(W*H)（约 4.5 万像素，亚毫秒），不做逐像素模板匹配，不拖慢效率。
 * emit('success', token) 通知父组件持有 token，业务请求时携带 captchaToken。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import http from '@/api/http'

const emit = defineEmits<{
  (e: 'success', token: string): void
  (e: 'reset'): void
}>()

const props = defineProps<{ hint?: string }>()

// ============ 坐标系约定（关键） ============
// 逻辑坐标一律使用「背景像素」（后端 300x150 图，缺口 SIZE=48），
// 即 puzzleLeft/puzzleTop/holeX/holeY/拖动范围 全部是 300 系背景像素。
// 显示层通过 scale = displayW / BG_W 统一换算成 CSS px，
// 任何地方都不再出现"显示像素混入逻辑计算"。
const BG_W = 300
const BG_H = 150
const SIZE = 48
/** 拼块可移动范围（背景像素）：0 .. BG_W-SIZE */
const TRACK_MAX = BG_W - SIZE

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
const puzzleLeft = ref(0) // 背景像素
const puzzleTop = ref(0) // 背景像素
const displayW = ref(BG_W) // 容器实际显示宽度（仅用于算 scale）
const scale = computed(() => displayW.value / BG_W)
const puzzleDispW = computed(() => Math.round(SIZE * scale.value))

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

/** 在 background 图上做一次线性扫描：统计白色像素（缺口白描边）包围盒 → 缺口左上角 (x,y) */
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

  // 白描边是 Color.WHITE(255)，实线 alpha=255；干扰线/色块远达不到纯白。
  let minX = Infinity
  let minY = Infinity
  let maxX = -1
  let maxY = -1
  let cnt = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] >= 250 && data[i + 1] >= 250 && data[i + 2] >= 250 && data[i + 3] >= 250) {
      const px = (i / 4) % BG_W
      const py = Math.floor(i / 4 / BG_W)
      if (px < minX) minX = px
      if (px > maxX) maxX = px
      if (py < minY) minY = py
      if (py > maxY) maxY = py
      cnt++
    }
  }

  // 描边矩形高≈48、点数充足才算检测成功；否则回退到中段随机（尽量命中后端 y∈[30,92] 中段）。
  const ok = cnt >= 100 && maxY - minY >= SIZE - 20
  holeX.value = ok ? minX : Math.floor((BG_W - SIZE) * (0.5 + Math.random() * 0.1))
  holeY.value = ok ? minY : Math.floor((BG_H - SIZE) / 2)
}

function measure() {
  // 容器实际显示宽度 → 只用于算 scale；逻辑坐标永远是 300 系背景像素
  if (!bgWrapEl.value) return
  const w = bgWrapEl.value.clientWidth
  displayW.value = w > 0 ? w : BG_W
}

function onPointerDown(e: PointerEvent) {
  if (done.value || loading.value || !captchaId.value) return
  dragging.value = true
  startX = e.clientX
  startLeft = puzzleLeft.value // 背景像素
  pointerMoveHandler = (ev: PointerEvent) => {
    if (!dragging.value) return
    // 鼠标位移 ÷ scale 换算回背景像素，再 clamp 到 [0, TRACK_MAX]
    let nx = startLeft + (ev.clientX - startX) / scale.value
    nx = Math.max(0, Math.min(TRACK_MAX, nx))
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
  // puzzleLeft 已是背景像素坐标，直接取整提交；后端容差 ±6px
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

onMounted(async () => {
  await nextTick()
  measure()
  window.addEventListener('resize', measure)
  fetchCaptcha()
})
onBeforeUnmount(() => {
  detach()
  window.removeEventListener('resize', measure)
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
          left: Math.round(puzzleLeft * scale) + 'px',
          top: Math.round(puzzleTop * scale) + 'px',
        }"
        @pointerdown="onPointerDown"
      />
      <div v-if="loading" class="loading">加载中...</div>
    </div>
    <div class="actions">
      <div class="track">
        <div class="fill" :style="{ width: Math.round((puzzleLeft / TRACK_MAX) * 100) + '%' }"></div>
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