<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Admin } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { listAdmins, createAdmin, deleteAdmin } from '@/api/admin'

const auth = useAuthStore()
const admins = ref<Admin[]>([])
const isSuper = auth.userId === 0

function refresh() {
  admins.value = listAdmins()
}
onMounted(refresh)

const dlg = ref(false)
const form = reactive({ nickname: '', phone: '', password: '' })
function submit() {
  if (!form.nickname || !form.phone || !form.password) return ElMessage.warning('请完整填写')
  createAdmin(form.nickname, form.phone, form.password)
  ElMessage.success('已创建管理员')
  dlg.value = false
  form.nickname = form.phone = form.password = ''
  refresh()
}
function del(a: Admin) {
  ElMessageBox.confirm(`确定删除管理员「${a.nickname}」？`, '删除', { type: 'warning' })
    .then(() => {
      deleteAdmin(a.id)
      ElMessage.success('已删除')
      refresh()
    })
    .catch(() => {})
}
</script>

<template>
  <div>
    <div class="flex-between mb-16">
      <h2 style="font-size: 18px">管理员管理</h2>
      <div class="flex gap-8">
        <el-tag v-if="!isSuper" type="info">仅超级管理员可创建/删除管理员</el-tag>
        <el-button v-if="isSuper" size="small" type="primary" @click="dlg = true">新建管理员</el-button>
      </div>
    </div>
    <el-alert type="warning" :closable="false" show-icon class="mb-16">
      ID 为 0 的超级管理员不可删除。
    </el-alert>
    <el-table :data="admins" border stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="nickname" label="昵称" min-width="160" />
      <el-table-column prop="phone" label="账号 / 手机号" min-width="160" />
      <el-table-column label="角色" width="140"><template #default="{ row }"><el-tag v-if="row.id === 0" type="danger">超级管理员</el-tag><el-tag v-else type="info" effect="plain">管理员</el-tag></template></el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" type="danger" text :disabled="row.id === 0 || !isSuper" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dlg" title="新建管理员" width="420px">
      <el-form label-position="top">
        <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
        <el-form-item label="账号（手机号）"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="初始密码"><el-input v-model="form.password" show-password /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg = false">取消</el-button>
        <el-button type="primary" @click="submit">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>
