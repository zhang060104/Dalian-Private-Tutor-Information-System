// ============================================================================
// 管理后台「待办」共享状态 + 轮询
// ----------------------------------------------------------------------------
// 1) 共享：待办概览页的卡片数字与侧栏红标读同一份数据，避免两处请求不一致；
// 2) 轮询：只有待办概览页（Dashboard.vue）挂载期间才跑，60 秒一次，
//    离开页面立即停止（onBeforeUnmount -> stopTodoPolling）；
// 3) 省流：浏览器标签页切到后台时跳过本轮，重新可见时立即补一次；
// 4) 静默：轮询失败不弹全局错误提示（http 层 silent），保留上一次结果，
//    只有进入页面时的首次加载与手动刷新才提示错误。
// ============================================================================
import { computed, ref } from 'vue'
import { listRequests, type RequestDTO } from '@/api/admin'

/** 轮询周期：1 分钟 */
export const TODO_POLL_INTERVAL = 60_000

const items = ref<RequestDTO[]>([])
const loading = ref(false)
const updatedAt = ref<number | null>(null)
const lastError = ref('')

/** 待处理数量：注册与资料审核(user) / 缴费(payment) / 毁约仲裁(arbit) */
const counts = computed(() => {
  const c = { user: 0, payment: 0, arbit: 0 }
  for (const i of items.value) {
    if (i.type === 0 || i.type === 1) c.user++
    else if (i.type >= 2 && i.type <= 4) c.payment++
    else if (i.type === 5) c.arbit++
  }
  return c
})

let timer: ReturnType<typeof setInterval> | null = null
let visibilityBound = false

/**
 * 拉取待办列表。
 * silent      —— 失败不弹全局错误提示（轮询默认静默）
 * showLoading —— 是否展示 loading（轮询不展示，避免每分钟闪一次）
 */
export async function refreshTodo(opts: { silent?: boolean; showLoading?: boolean } = {}): Promise<void> {
  const { silent = true, showLoading = false } = opts
  if (showLoading) loading.value = true
  try {
    items.value = await listRequests({ pending: true, silent })
    updatedAt.value = Date.now()
    lastError.value = ''
  } catch (e) {
    lastError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    if (showLoading) loading.value = false
  }
}

function tick() {
  // 标签页在后台时不请求，回来时由 onVisible 立即补一次
  if (typeof document !== 'undefined' && document.hidden) return
  void refreshTodo()
}

function onVisible() {
  if (typeof document === 'undefined' || document.hidden) return
  if (timer === null) return // 已经离开待办概览页，不补请求
  void refreshTodo()
}

/** 开始轮询：待办概览页挂载时调用；重复调用无副作用 */
export function startTodoPolling(): void {
  if (timer !== null) return
  void refreshTodo({ silent: false, showLoading: true })
  timer = setInterval(tick, TODO_POLL_INTERVAL)
  if (!visibilityBound && typeof document !== 'undefined') {
    visibilityBound = true
    document.addEventListener('visibilitychange', onVisible)
  }
}

/** 停止轮询：离开待办概览页时调用；保留最后一次结果供侧栏红标使用 */
export function stopTodoPolling(): void {
  if (timer === null) return
  clearInterval(timer)
  timer = null
}

export function useAdminTodo() {
  return { items, loading, counts, updatedAt, lastError, refreshTodo, startTodoPolling, stopTodoPolling }
}
