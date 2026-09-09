<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Role } from '@/types'
import { listPendingRequests, resolveArbitration, getOrderParties, type RequestView } from '@/api/admin'

const items = ref<RequestView[]>([])
type ArbReq = RequestView & { kind: 'arbitration' }
const arbs = () => items.value.filter((i) => i.kind === 'arbitration') as ArbReq[]

function refresh() {
  items.value = listPendingRequests()
}
onMounted(refresh)

function parties(o: ArbReq) {
  return getOrderParties(o.orderId)
}

function resolve(o: ArbReq, role: Role, userId: number, delta: number) {
  ElMessageBox.confirm(`将订单 #${o.orderId} 结案，并给${role === 'teacher' ? '教师' : '学生'}信用分${delta >= 0 ? '+' : ''}${delta}。确认？`, '仲裁裁定', { type: 'warning' })
    .then(() => {
      resolveArbitration(o.orderId, o.id, { role, userId, delta })
      ElMessage.success('已结案并调整信用分')
      refresh()
    })
    .catch(() => {})
}
</script>

<template>
  <div>
    <div class="flex-between mb-16">
      <h2 style="font-size: 18px">订单毁约仲裁</h2>
      <el-button size="small" @click="refresh">刷新</el-button>
    </div>
    <el-empty v-if="!arbs().length" description="暂无仲裁申请" />
    <el-card v-for="o in arbs()" :key="o.id" shadow="never" class="arb">
      <div class="head">
        <el-tag type="danger" effect="plain">毁约仲裁</el-tag>
        <span>订单 #{{ o.orderId }}</span>
        <span class="muted">由{{ o.initiatorRole === 'teacher' ? '教师' : '学生' }}提起</span>
      </div>
      <div class="text">{{ o.text || '（未填写描述）' }}</div>
      <div v-if="o.evidence.length" class="muted">证据 {{ o.evidence.length }} 张</div>
      <div v-if="parties(o)" class="parties">
        <span>教师：{{ parties(o)!.teacherName }}（#{{ parties(o)!.teacher_id }}）</span>
        <span>学生：{{ parties(o)!.studentName }}（#{{ parties(o)!.student_id }}）</span>
      </div>
      <div class="ops">
        <el-button size="small" type="primary" @click="parties(o) && resolve(o, 'teacher', parties(o)!.teacher_id, -10)">裁定教师违约 -10</el-button>
        <el-button size="small" type="primary" plain @click="parties(o) && resolve(o, 'student', parties(o)!.student_id, -10)">裁定学生违约 -10</el-button>
        <el-button size="small" type="success" plain @click="parties(o) && resolve(o, 'teacher', parties(o)!.teacher_id, 0)">双方无责结案</el-button>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.arb {
  margin-bottom: 14px;
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.text {
  padding: 10px;
  background: #fafcff;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 8px;
}
.parties {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}
.ops {
  display: flex;
  gap: 8px;
}
</style>
