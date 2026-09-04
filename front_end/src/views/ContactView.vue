<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { ChatDotRound, Phone, Clock, Message } from '@element-plus/icons-vue'
import { GRADE_OPTIONS, SUBJECT_OPTIONS } from '@/data/tutors'
import { CENTER_CONTACT, type TutorRequest } from '@/types'

const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive<TutorRequest>({
  parentName: '',
  contact: '',
  grade: '',
  subject: '',
  mode: '均可',
  schedule: '',
  remark: '',
})

const rules: FormRules = {
  parentName: [{ required: true, message: '请填写您的称呼', trigger: 'blur' }],
  contact: [
    { required: true, message: '请填写联系电话或微信', trigger: 'blur' },
    { min: 5, max: 40, message: '长度 5-40 个字符', trigger: 'blur' },
  ],
  grade: [{ required: true, message: '请选择学生年级', trigger: 'change' }],
  subject: [{ required: true, message: '请选择辅导科目', trigger: 'change' }],
  schedule: [{ required: true, message: '请填写期望上课时间', trigger: 'blur' }],
}

async function submit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    // ⚠️ 初始化阶段为前端演示：模拟提交成功。
    // 后续接入后端后，在此调用需求提交接口（POST /api/requests 等）。
    await new Promise((resolve) => setTimeout(resolve, 600))
    ElMessage.success(`已收到您的需求，顾问将尽快联系您（${form.parentName}）`)
    formRef.value.resetFields()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="contact-page">
    <div class="page-hero">
      <div class="container">
        <h1 class="page-title">找家教 / 免费预约试听</h1>
        <p class="page-sub">留下需求，顾问 2 小时内响应，为您免费匹配 2-3 位合适教员。</p>
      </div>
    </div>

    <div class="container page-body">
      <div class="contact-layout">
        <!-- 需求表单 -->
        <div class="form-card">
          <div class="card-heading">
            <h2 class="card-title">填写家教需求</h2>
            <p class="card-desc">带 * 为必填项，信息仅用于教员匹配，我们会严格保密。</p>
          </div>

          <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" class="req-form">
            <el-form-item label="您的称呼" prop="parentName">
              <el-input v-model="form.parentName" placeholder="如：张妈妈 / 李先生" maxlength="20" />
            </el-form-item>
            <el-form-item label="联系电话/微信" prop="contact">
              <el-input v-model="form.contact" placeholder="手机号或微信号" maxlength="40" />
            </el-form-item>
            <el-form-item label="学生年级" prop="grade">
              <el-select v-model="form.grade" placeholder="请选择年级" style="width: 100%">
                <el-option v-for="g in GRADE_OPTIONS" :key="g" :label="g" :value="g" />
              </el-select>
            </el-form-item>
            <el-form-item label="辅导科目" prop="subject">
              <el-select v-model="form.subject" placeholder="请选择科目" style="width: 100%">
                <el-option v-for="s in SUBJECT_OPTIONS" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
            <el-form-item label="授课方式" prop="mode">
              <el-radio-group v-model="form.mode">
                <el-radio value="上门">上门</el-radio>
                <el-radio value="在线">在线</el-radio>
                <el-radio value="均可">均可</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="期望上课时间" prop="schedule">
              <el-input v-model="form.schedule" placeholder="如：每周六上午 / 工作日晚上 7 点后" maxlength="60" />
            </el-form-item>
            <el-form-item label="补充说明" prop="remark">
              <el-input
                v-model="form.remark"
                type="textarea"
                :rows="4"
                placeholder="如：孩子目前成绩情况、薄弱环节、目标学校等（选填）"
                maxlength="300"
                show-word-limit
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" size="large" round :loading="submitting" class="submit-btn" @click="submit">
                提交需求，免费试听
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 联系侧栏 -->
        <div class="side-col">
          <div class="side-card">
            <div class="side-title">直接联系我们</div>
            <div class="side-item">
              <el-icon color="#2f7cf6"><Phone /></el-icon>
              <div>
                <div class="side-label">咨询热线</div>
                <a :href="`tel:${CENTER_CONTACT.phone}`" class="side-phone">{{ CENTER_CONTACT.phone }}</a>
              </div>
            </div>
            <div class="side-item">
              <el-icon color="#2f7cf6"><Clock /></el-icon>
              <div>
                <div class="side-label">服务时间</div>
                <div class="side-text">{{ CENTER_CONTACT.serviceTime }}</div>
              </div>
            </div>
            <div class="side-item">
              <el-icon color="#2f7cf6"><ChatDotRound /></el-icon>
              <div>
                <div class="side-label">微信咨询</div>
                <div class="side-text">{{ CENTER_CONTACT.wechat }}</div>
              </div>
            </div>
            <div class="side-item">
              <el-icon color="#2f7cf6"><Message /></el-icon>
              <div>
                <div class="side-label">服务范围</div>
                <div class="side-text">{{ CENTER_CONTACT.address }}</div>
              </div>
            </div>
          </div>

          <div class="side-card tips">
            <div class="side-title">预约小贴士</div>
            <ul>
              <li>试听全程免费，满意后再开课</li>
              <li>可同时试听 2 位老师再做决定</li>
              <li>上门授课区域以教员可服务范围为准</li>
              <li>高峰时段（开学季）排期紧张，建议提前预约</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-hero {
  background:
    radial-gradient(700px 300px at 90% 0%, rgba(47, 124, 246, 0.14), transparent 60%),
    linear-gradient(180deg, #f4f8ff 0%, #ffffff 100%);
  border-bottom: 1px solid var(--border-color);
  padding: 52px 0 44px;
}

.page-title {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 10px;
}

.page-sub {
  color: var(--text-secondary);
  font-size: 15px;
}

.page-body {
  padding-top: 32px;
  padding-bottom: 72px;
}

.contact-layout {
  display: grid;
  grid-template-columns: 1.4fr 0.6fr;
  gap: 28px;
  align-items: start;
}

.form-card {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 32px 34px 20px;
}

.card-heading {
  margin-bottom: 24px;
}

.card-title {
  font-size: 21px;
  font-weight: 700;
}

.card-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.req-form {
  max-width: 560px;
}

.submit-btn {
  width: 220px;
}

.side-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.side-card {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 24px 22px;
}

.side-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 16px;
}

.side-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 8px 0;
}

.side-item .el-icon {
  font-size: 21px;
  margin-top: 2px;
}

.side-label {
  font-size: 12.5px;
  color: var(--text-tertiary);
}

.side-phone {
  font-size: 19px;
  font-weight: 800;
  color: var(--brand-color-dark);
}

.side-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.tips ul {
  list-style: none;
}

.tips li {
  position: relative;
  padding: 6px 0 6px 18px;
  font-size: 13.5px;
  color: var(--text-secondary);
}

.tips li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 15px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-color);
}

@media (max-width: 960px) {
  .contact-layout {
    grid-template-columns: 1fr;
  }
}
</style>
