<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules, type UploadUserFile } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import ScheduleEditor from '@/components/ScheduleEditor.vue'
import SliderCaptcha from '@/components/SliderCaptcha.vue'
import http from '@/api/http'
import { register, type RegisterPayloadDTO } from '@/api/auth'
import { GRADE_LEVELS, TEACHER_GRADE_LEVELS } from '@/utils/grade'
import { encodeSubjects, SUBJECTS } from '@/utils/subject'
import type { WeekTimeTables } from '@/types'

const router = useRouter()

const formRef = ref<FormInstance>()
const role = ref<'student' | 'teacher'>('teacher')

const form = reactive({
  nickname: '',
  password: '',
  confirm: '',
  phone: '',
  age: undefined as number | undefined,
  gender: undefined as '男' | '女' | undefined,
  grade: undefined as number | undefined,
  subjects: [] as number[],
  description: '',
  address: '',
  timeTables: [0, 0, 0, 0, 0, 0, 0] as WeekTimeTables,
  qrcode: '',
  idcard: '',
  certificate: '',
})

const captchaToken = ref<string>('')
const uploading = ref<Record<string, boolean>>({})

const gradeOptions = computed(() =>
  role.value === 'teacher' ? TEACHER_GRADE_LEVELS : GRADE_LEVELS
)
const gradeLabelText = computed(() =>
  role.value === 'teacher' ? '本人年级（在读大学生 / 已毕业）' : '就读 / 求学年级'
)

const rules = reactive<FormRules>({
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  phone: [
    { required: true, pattern: /^1\d{10}$/, message: '请输入 11 位手机号', trigger: 'blur' },
  ],
  password: [{ required: true, min: 6, message: '密码至少 6 位', trigger: 'blur' }],
  confirm: [
    {
      validator: (_r, v, cb) => (v === form.password ? cb() : cb(new Error('两次密码不一致'))),
      trigger: 'blur',
    },
  ],
  grade: [{ required: true, message: '请选择年级', trigger: 'change' }],
  qrcode: [{ required: true, message: '请上传收款码截图', trigger: 'change' }],
  idcard: [{ required: true, message: '请上传身份证人像面', trigger: 'change' }],
})

/** 真实上传：multipart 到 /api/upload，返回服务端 url。
 *  注册页为匿名上传：必须带 X-Captcha-Token（滑块验证签发）。
 *  Content-Type 交由 axios/浏览器自动生成（含 boundary），切勿手写。 */
async function uploadImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const headers = captchaToken.value ? { 'X-Captcha-Token': captchaToken.value } : undefined
  const res = await http.post<{ url: string }>('/api/upload', fd, { headers })
  return res.url
}

// 上传组件实例（用于失败/未验证时清空列表）
type UploadInst = { clearFiles: () => void } | null
const upQr = ref<UploadInst>(null)
const upId = ref<UploadInst>(null)
const upCert = ref<UploadInst>(null)
const uploadRefOf = (field: 'qrcode' | 'idcard' | 'certificate') =>
  field === 'qrcode' ? upQr : field === 'idcard' ? upId : upCert

async function onFile(
  field: 'qrcode' | 'idcard' | 'certificate',
  uploadFile: UploadUserFile
) {
  const raw = uploadFile.raw
  if (!raw) {
    ElMessage.error('请选择有效的图片文件')
    return
  }
  // 匿名上传必须先完成滑块验证拿到 captchaToken（安全验证项在下方上传区之前）
  if (!captchaToken.value) {
    ElMessage.warning('请先完成「安全验证」滑块，再进行图片上传')
    uploadRefOf(field).value?.clearFiles()
    return
  }
  uploading.value[field] = true
  try {
    form[field] = await uploadImage(raw)
  } catch (e) {
    // http 拦截器已弹错；移除列表项避免误以为上传成功
    uploadRefOf(field).value?.clearFiles()
  } finally {
    uploading.value[field] = false
  }
}

function onFileError() {
  ElMessage.error('请选择图片文件')
}

function onCaptcha(token: string) {
  captchaToken.value = token
}
function onCaptchaReset() {
  captchaToken.value = ''
}

async function submit() {
  await formRef.value?.validate()
  if (!captchaToken.value) {
    ElMessage.warning('请先完成滑块验证')
    return
  }
  if (!form.subjects.length) {
    ElMessage.warning(
      role.value === 'teacher' ? '请至少选择一个可授科目' : '请至少选择一个需要的科目'
    )
    return
  }
  const subject = encodeSubjects(form.subjects)
  const payload: RegisterPayloadDTO = {
    role: role.value,
    phone: form.phone,
    password: form.password,
    captchaToken: captchaToken.value,
    nickname: form.nickname,
    grade: form.grade!,
    subject,
    description: form.description || undefined,
    address: form.address || undefined,
    age: form.age ?? null as unknown as number,
    gender: form.gender,
    qrcode: form.qrcode,
    idcard: form.idcard,
    certificate: role.value === 'teacher' ? form.certificate : undefined,
    timeTable1: form.timeTables[0],
    timeTable2: form.timeTables[1],
    timeTable3: form.timeTables[2],
    timeTable4: form.timeTables[3],
    timeTable5: form.timeTables[4],
    timeTable6: form.timeTables[5],
    timeTable7: form.timeTables[6],
  }
  try {
    await register(payload)
    ElMessage.success('入驻申请已提交，请等待管理员审核通过后登录')
    router.push('/login')
  } catch (e) {
    // http 已弹错
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
          <el-segmented
            v-model="role"
            :options="[
              { label: '老师', value: 'teacher' },
              { label: '学生', value: 'student' },
            ]"
            block
          />
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
              <el-input-number v-model="form.age" :min="1" :max="99" :controls="false" placeholder="选填" style="width: 100%" />
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

        <el-form-item
          :label="role === 'teacher' ? '可授科目' : '需要辅导的科目'"
          required
        >
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
        <el-form-item label="安全验证（请先完成滑块，再上传图片）">
          <div style="width: 100%">
            <SliderCaptcha @success="onCaptcha" @reset="onCaptchaReset" />
            <div class="muted captcha-tip">图片上传需匿名提交（注册未登录），系统要求先通过滑块验证；验证 5 分钟内有效，可连续上传多张。</div>
          </div>
        </el-form-item>
        <el-form-item label="收款码截图（收款/信息费用）" prop="qrcode">
          <el-upload
            ref="upQr"
            action="#"
            :auto-upload="false"
            :limit="1"
            :show-file-list="true"
            accept="image/*"
            list-type="picture-card"
            :on-change="(f: UploadUserFile) => onFile('qrcode', f)"
            :on-error="onFileError"
            :on-exceed="() => ElMessage.warning('仅一张')"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="身份证人像面（实名认证）" prop="idcard">
          <el-upload
            ref="upId"
            action="#"
            :auto-upload="false"
            :limit="1"
            :show-file-list="true"
            accept="image/*"
            list-type="picture-card"
            :on-change="(f: UploadUserFile) => onFile('idcard', f)"
            :on-error="onFileError"
            :on-exceed="() => ElMessage.warning('仅一张')"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item v-if="role === 'teacher'" label="教师资格 / 资质证明（选填）">
          <el-upload
            ref="upCert"
            action="#"
            :auto-upload="false"
            :limit="1"
            :show-file-list="true"
            accept="image/*"
            list-type="picture-card"
            :on-change="(f: UploadUserFile) => onFile('certificate', f)"
            :on-error="onFileError"
            :on-exceed="() => ElMessage.warning('仅一张')"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>

        <el-button type="primary" size="large" class="submit" @click="submit">
          提交入驻申请
        </el-button>
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
.captcha-tip {
  font-size: 12px;
  line-height: 1.6;
  margin-top: 6px;
}
.submit {
  width: 100%;
}
</style>