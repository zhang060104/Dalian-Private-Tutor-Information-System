<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { Profile, Role } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { listStudents, listTeachers } from '@/api/users'
import { gradeLabel } from '@/utils/grade'
import { decodeSubjects } from '@/utils/subject'
import { timetableSummary } from '@/utils/timetable'

const auth = useAuthStore()
const router = useRouter()

const myRole = ref<Role>(auth.role ?? 'teacher')
// 默认 tab：教师看学生池、学生看老师池
const activeTab = ref<'student' | 'teacher'>(myRole.value === 'teacher' ? 'student' : 'teacher')

const filter = reactive({ keyword: '', grade: undefined as number | undefined, subject: undefined as number | undefined })
const list = ref<Profile[]>([])
const loading = ref(false)

async function loadTab(tab: 'student' | 'teacher') {
  loading.value = true
  const f = { keyword: filter.keyword || undefined, grade: filter.grade, subject: filter.subject }
  try {
    list.value = tab === 'student' ? await listStudents(f) : await listTeachers(f)
  } catch {
    ElMessage.error('加载列表失败')
  } finally {
    loading.value = false
  }
}

function onTab(tab: 'student' | 'teacher') {
  activeTab.value = tab
  loadTab(tab)
}
function onTabChange(v: string | number) {
  onTab(v as 'student' | 'teacher')
}
function onSearch() {
  loadTab(activeTab.value)
}
function goPerson(p: Profile) {
  router.push(`/person/${p.role}/${p.id}`)
}
function subjectsText(p: Profile): string {
  const arr = decodeSubjects(p.subject)
  return arr.length ? arr.join('、') : '—'
}
function timeText(p: Profile): string {
  const s = timetableSummary(p.timeTables)
  if (!s.length) return '时间待定'
  return s.map((d) => d.day).join('、') + ' 等'
}

onMounted(() => {
  // 清理占位调用
  loadTab(activeTab.value)
})
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">匹配大厅</h1>
      <span class="muted">点击用户查看完整资料并发起匹配</span>
    </div>

    <el-card shadow="never">
      <div class="toolbar">
        <el-input v-model="filter.keyword" placeholder="搜索昵称 / 简介" clearable class="kw" @keyup.enter="onSearch" @clear="onSearch">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filter.grade" placeholder="年级筛选" clearable class="grade" @change="onSearch">
          <el-option v-for="g in 18" :key="g - 1" :label="gradeLabel(g - 1)" :value="g - 1" />
        </el-select>
        <el-button type="primary" @click="onSearch">查询</el-button>
      </div>

      <el-tabs v-model="activeTab" @tab-change="onTabChange">
        <el-tab-pane :name="'student'">
          <template #label>学生（找家教）</template>
          <div class="list">
            <el-skeleton v-if="loading" :rows="4" animated />
            <el-empty v-else-if="!list.length" description="暂无可匹配的用户" />
            <div v-for="p in list" :key="p.id" class="row" @click="goPerson(p)">
              <div class="avatar">{{ p.nickname.charAt(0) }}</div>
              <div class="main">
                <div class="line1">
                  <b>{{ p.nickname }}</b>
                  <el-tag size="small" type="info" effect="plain">{{ gradeLabel(p.grade) }}</el-tag>
                  <span class="credit-pill">信用 {{ p.credit }}</span>
                </div>
                <div class="tags"><el-tag v-for="s in subjectsText(p).split('、')" v-show="s !== '—'" :key="s" size="small" effect="plain" type="success">{{ s }}</el-tag></div>
                <div class="desc">{{ p.description }}</div>
                <div class="time muted">空闲：{{ timeText(p) }}</div>
              </div>
              <el-button v-if="myRole !== 'student'" text type="primary" @click.stop="goPerson(p)">投递简历</el-button>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane :name="'teacher'">
          <template #label>老师（可接单）</template>
          <div class="list">
            <el-skeleton v-if="loading" :rows="4" animated />
            <el-empty v-else-if="!list.length" description="暂无可匹配的用户" />
            <div v-for="p in list" :key="p.id" class="row" @click="goPerson(p)">
              <div class="avatar">{{ p.nickname.charAt(0) }}</div>
              <div class="main">
                <div class="line1">
                  <b>{{ p.nickname }}</b>
                  <el-tag size="small" type="info" effect="plain">{{ gradeLabel(p.grade) }}</el-tag>
                  <span class="credit-pill">信用 {{ p.credit }}</span>
                </div>
                <div class="tags"><el-tag v-for="s in subjectsText(p).split('、')" v-show="s !== '—'" :key="s" size="small" effect="plain" type="success">{{ s }}</el-tag></div>
                <div class="desc">{{ p.description }}</div>
                <div class="time muted">空闲：{{ timeText(p) }}</div>
              </div>
              <el-button v-if="myRole === 'student'" text type="primary" @click.stop="goPerson(p)">免费试课</el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}
.kw {
  width: 260px;
}
.grade {
  width: 180px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid #eef1f6;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.row:hover {
  border-color: #cfe0fb;
  background: #fafcff;
}
.avatar {
  width: 46px;
  height: 46px;
  flex: none;
  border-radius: 50%;
  background: #e5efff;
  color: #2f7cf6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
}
.main {
  flex: 1;
  min-width: 0;
}
.line1 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.line1 b {
  font-size: 15px;
  color: #1d2740;
}
.tags {
  margin: 4px 0;
}
.desc {
  font-size: 13px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.time {
  font-size: 12px;
  margin-top: 2px;
}

/* ---------- 手机端 ---------- */
@media (max-width: 768px) {
  .toolbar {
    flex-wrap: wrap;
  }
  .kw,
  .grade {
    width: 100%;
  }
  .toolbar .el-button {
    width: 100%;
  }
  .row {
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
  }
  .line1 {
    flex-wrap: wrap;
    row-gap: 4px;
  }
  .avatar {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
  .row > .el-button {
    flex: none;
    padding: 4px 2px;
  }
}
</style>
