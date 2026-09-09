<script setup lang="ts">
// 滑块验证码（防止 ddos；文档业务逻辑 13）
// 拖到底 → 通过 → emit('success')
import { ref } from 'vue'

const emit = defineEmits<{ (e: 'success'): void }>()
const props = defineProps<{ hint?: string }>()

const done = ref(false)
const offset = ref(0)
const trackWidth = 300
const dragging = ref(false)
let startX = 0
let startOffset = 0

function onDown(e: PointerEvent) {
  if (done.value) return
  dragging.value = true
  startX = e.clientX
  startOffset = offset.value
  const move = (ev: PointerEvent) => {
    if (!dragging.value) return
    let nx = startOffset + (ev.clientX - startX)
    nx = Math.max(0, Math.min(trackWidth, nx))
    offset.value = nx
    if (nx >= trackWidth - 2) {
      dragging.value = false
      done.value = true
      offset.value = trackWidth
      emit('success')
    }
  }
  const up = () => {
    dragging.value = false
    if (!done.value && offset.value < trackWidth) offset.value = 0
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}
</script>

<template>
  <div class="captcha" :class="{ done }">
    <div class="track" :style="{ width: trackWidth + 'px' }" @pointerdown="onDown">
      <div class="fill" :style="{ width: offset + 'px' }"></div>
      <div class="knob" :style="{ transform: `translateX(${offset}px)` }">▶</div>
      <span v-if="!done && !dragging" class="tip">{{ props.hint ?? '向右拖动滑块完成验证' }}</span>
      <span v-if="done" class="ok">✓ 验证通过</span>
    </div>
  </div>
</template>

<style scoped>
.captcha {
  width: 100%;
}
.track {
  position: relative;
  height: 40px;
  border: 1px solid #d8dee8;
  border-radius: 6px;
  background: #f4f7fb;
  overflow: hidden;
  user-select: none;
}
.fill {
  height: 100%;
  background: #d6e7ff;
  transition: width 0.1s;
}
.knob {
  position: absolute;
  left: 0;
  top: 0;
  width: 42px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2f7cf6;
  color: #fff;
  font-size: 14px;
  cursor: grab;
  border-radius: 4px;
  touch-action: none;
}
.captcha.done .knob {
  background: #1d9e75;
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
