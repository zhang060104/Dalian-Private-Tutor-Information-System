<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules, type UploadUserFile } from 'element-plus'
import ScheduleEditor from '@/components/ScheduleEditor.vue'
import SliderCaptcha from '@/components/SliderCaptcha.vue'
import { registerUser } from '@/api/auth'
import { GRADE_LEVELS, TEACHER_GRADE_LEVELS } from '@/utils/grade'
import { SUBJECTS } from '@/utils/subject'
import type { WeekTimeTables } from '@/types'

const router = useRouter()
const formRef = ref<FormInstance>()
const role = ref<'student' | 'teacher'>('teacher')

const form = reactive({
  nickname: '', password: '', confirm: '', phone: '',
  age: undefined as number | undefined, gender: undefined as '男' | '女' | undefined,
  grade: undefined as number | undefined,
  subjects: [] as number[],
  description: '',
  address: '',
  timeTables: [0, 0, 0, 0, 0, 0, 0] as WeekTimeTables,
  // 图片：mock 存占位路径
  QRcode: '', IDcard: '', certificate: '',
})

const captchaOk = ref(false)

const gradeOptions = computed(() => (role.value === 'teacher' ? TEACHER_GRADE_LEVELS : GRADE_LEVELS))
const gradeLabelText = computed(() => (role.value === 'teacher' ? '可授年级（大学生及以上）' : '就读 / 求学年级'))

const rules = reactive<FormRules>({
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  phone: [{ required: true, pattern: /^1\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' }],
  password: [{ required: true, min: 6, message: '密码至少 6 位', trigger: 'blur' }],
  confirm: [{
    validator: (_r, v, cb) => (v === form.password ? cb() : cb(new Error('两次密码不一致'))),
    trigger: 'blur',
  }],
  grade: [{ required: true, message: '请选择年级', trigger: 'change' }],
  QRcode: [{ required: true, message: '请上传收款码截图（便于收取费用）', trigger: 'change' }],
  IDcard: [{ required: true, message: '请上传身份证人像面（实名认证）', trigger: 'change' }],
})

/** mock 上传：真实环境替换为 multipart 上传返回 url */
function onFile(field: 'QRcode' | 'IDcard' | 'certificate', file: UploadUserFile) {
  form[field] = `/mock/${field}/${Date.now()}-${file.name}`
}
function onFileError() {
  ElMessage.error('请选择图片文件')
}
function setCaptcha() {
  captchaOk.value = true
}

async function submit() {
  await formRef.value?.validate()
  if (!captchaOk.value) {
    ElMessage.warning('请先完成滑块验证')
    return
  }
  if (!form.subjects.length) {
    ElMessage.warning(role.value === 'teacher' ? '请至少选择一个可授科目' : '请至少选择一个需要的科目')
    return
  }
  // 编码科目位掩码
  let subject = 0
  form.subjects.forEach((i) => (subject |= 1 << i))
  try {
    await registerUser({
      role: role.value, nickname: form.nickname, password: form.password, phone: form.phone,
      QRcode: form.QRcode, IDcard: form.IDcard,
      certificate: role.value === 'teacher' ? form.certificate : undefined,
      grade: form.grade, subject, age: form.age ?? null, gender: form.gender,
      description: form.description, address: form.address || null,
    })
    ElMessage.success('入驻申请已提交，请等待管理员审核通过后登录')
    router.push('/login')
  } catch (e) {
    ElMessage.error((e as Error).message || '提交失败')
  }
}

const subjectModel = computed(() => form.subjects)
function onSubjectChange(v: number[]) {
  form.subjects = v
}
</script>

<template>
  <div class="reg-wrap">
    <el-card class="card" shadow="never">
      <h2 class="title">入驻大连家教中心</h2>
      <el-alert type="info" :closable="false" show-icon class="tip">
        注册信息需提交平台<b>管理员审核</b>，审核通过后方可登录。请如实填写真实资料。
      </el-alert>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large">
        <el-form-item label="我是">
          <el-segmented v-model="role" :options="[{ label: '老师', value: 'teacher' }, { label: '学生', value: 'student' }]" block />
        </el-form-item>

        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" maxlength="16" placeholder="对外展示的昵称 / 称呼" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" maxlength="11" placeholder="用于登录，审核通过后不可修改" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="年龄" prop="age">
              <el-input-number v-model="form.age" :min="6" :max="90" :controls="false" placeholder="选填" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input v-model="form.password" type="password" show-password placeholder="至少 6 位" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="确认密码" prop="confirm">
              <el-input v-model="form.confirm" type="password" show-password placeholder="再次输入" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="性别">
          <el-radio-group v-model="form.gender">
            <el-radio-button value="男">男</el-radio-button>
            <el-radio-button value="女">女</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="gradeLabelText" prop="grade">
          <el-select v-model="form.grade" placeholder="选择" style="width: 100%">
            <el-option v-for="g in gradeOptions" :key="g.value" :label="g.label" :value="g.value" />
          </el-select>
        </el-form-item>

        <el-form-item :label="role === 'teacher' ? '可授科目' : '需要辅导的科目'" required>
          <el-checkbox-group :model-value="subjectModel" @change="onSubjectChange">
            <el-checkbox v-for="(s, i) in SUBJECTS" :key="s" :value="i">{{ s }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="个人简介">
          <el-input v-model="form.description" type="textarea" :rows="3" :maxlength="500" show-word-limit placeholder="介绍自己 / 需求，便于对方了解" />
        </el-form-item>
        <el-form-item label="常用授课 / 所在区域（地址）">
          <el-input v-model="form.address" placeholder="如：沙河口区·西安路（精确地址仅在缴费核验后互见）" />
        </el-form-item>

        <el-form-item label="空闲时间（可授课 / 可上课时段）">
          <ScheduleEditor v-model="form.timeTables" />
        </el-form-item>

        <el-divider content-position="left">实名与收款凭证</el-divider>
        <el-form-item label="收款码截图（老师必传 / 学生收款也建议传）" prop="QRcode">
          <el-upload action="#" :auto-upload="false" :limit="1" :show-file-list="true" accept="image/*" list-type="picture-card"
            :on-change="(f: UploadUserFile) => onFile('QRcode', f)" :on-error="onFileError" :on-exceed="() => ElMessage.warning('仅一张')">
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="身份证人像面（实名认证）" prop="IDcard">
          <el-upload action="#" :auto-upload="false" :limit="1" :show-file-list="true" accept="image/*" list-type="picture-card"
            :on-change="(f: UploadUserFile) => onFile('IDcard', f)" :on-error="onFileError" :on-exceed="() => ElMessage.warning('仅一张')">
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item v-if="role === 'teacher'" label="教师资格 / 资质证明（选填）">
          <el-upload action="#" :auto-upload="false" :limit="1" :show-file-list="true" accept="image/*" list-type="picture-card"
            :on-change="(f: UploadUserFile) => onFile('certificate', f)" :on-error="onFileError" :on-exceed="() => ElMessage.warning('仅一张')">
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>

        <el-form-item label="安全验证">
          <SliderCaptcha @success="setCaptcha" />
        </el-form-item>

        <el-button type="primary" size="large" class="submit" @click="submit">提交入驻申请</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.reg-wrap {
  min-height: 72vh;
  display: flex;
  justify-content: center;
  padding: 30px 16px;
}
.card {
  width: 720px;
  border-radius: 14px;
}
.title {
  font-size: 20px;
  margin-bottom: 16px;
  color: #1d2740;
}
.tip {
  margin-bottom: 20px;
}
.submit {
  width: 100%;
}
</style>
