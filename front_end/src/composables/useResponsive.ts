import { computed, ref } from 'vue'

/**
 * 响应式渲染辅助（全站单例）
 *
 * - `isMobile`：≤768px —— 手机（竖屏）
 * - `isNarrow`：≤1024px —— 平板 / 分屏窄窗口
 * - `descCols`：el-descriptions 列数（手机 1 列、桌面 2 列）
 * - `halfSpan` / `thirdSpan`：el-col 栅格跨度（手机上统一 24 = 整行）
 * - `dlgWidth(px)`：弹窗宽度（手机上 94%，桌面用传入的固定宽度）
 *
 * 监听 resize / orientationchange，屏幕尺寸变化时自动触发重新渲染。
 */
export const MOBILE_MAX = 768

export const NARROW_MAX = 1024

const isMobile = ref(false)
const isNarrow = ref(false)
let bound = false

function sync() {
  if (typeof window === 'undefined') return
  const w = window.innerWidth
  isMobile.value = w <= MOBILE_MAX
  isNarrow.value = w <= NARROW_MAX
}

function bind() {
  if (bound || typeof window === 'undefined') return
  bound = true
  sync()
  window.addEventListener('resize', sync, { passive: true })
  window.addEventListener('orientationchange', sync)
}

// 模块加载即绑定一次（全站共享同一套监听，避免每个组件重复注册）
bind()

export function useResponsive() {
  bind()
  const descCols = computed(() => (isMobile.value ? 1 : 2))
  const halfSpan = computed(() => (isMobile.value ? 24 : 12))
  const thirdSpan = computed(() => (isMobile.value ? 24 : 8))
  const dlgWidth = (desktop: string) => (isMobile.value ? '94%' : desktop)
  return { isMobile, isNarrow, descCols, halfSpan, thirdSpan, dlgWidth }
}

export { isMobile, isNarrow }
