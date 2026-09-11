<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

function go() {
  if (auth.isLoggedIn && auth.role !== 'admin') router.push('/directory')
  else router.push('/login')
}
</script>

<template>
  <div class="home">
    <section class="hero">
      <div class="container">
        <div class="badge">大连本地 · 实名认证家教</div>
        <h1>找到合适的家教，<br />就从一次<b>免费试课</b>开始</h1>
        <p class="sub">首节课免费试听，满意再续。师生双向选择，双方定金保障，平台透明监管。</p>
        <div class="cta">
          <el-button type="primary" size="large" round @click="go">立即免费试课</el-button>
          <el-button size="large" round plain @click="router.push('/register')">入驻成为老师</el-button>
        </div>
      </div>
    </section>

    <section class="steps">
      <div class="container">
        <h2>三步，找到合适的一对一</h2>
        <div class="cards">
          <div class="card"><div class="no">1</div><h3>注册完善资料</h3><p>学生发布需求，老师展示可授课信息，实名 + 资质审核保障靠谱。</p></div>
          <div class="card"><div class="no">2</div><h3>匹配与试课</h3><p>双方双向选择，第一次上课免费试听，合不合适试过就知道。</p></div>
          <div class="card"><div class="no">3</div><h3>安心长期授课</h3><p>定金防逃单、信息费防刷单，结算灵活，全程平台兜底。</p></div>
        </div>
      </div>
    </section>
    <section class="roles">
      <div class="container">
        <h2>教师 / 学生，两种入口</h2>
        <p class="roles-sub">实名认证 + 双向选择 + 定金保障，找家教和做家教都更省心。</p>
        <div class="role-cards">
          <div class="role-card">
            <img src="/imgs/teacher-poster.png" alt="教师端海报" />
            <div class="role-body">
              <h3>我是老师</h3>
              <p>发布可授科目与空闲时间，等待学生投递；试课满意再正式开课，平台保障结算。</p>
              <el-button type="primary" round @click="router.push('/register')">教师入驻</el-button>
            </div>
          </div>
          <div class="role-card">
            <img src="/imgs/student-poster.png" alt="学生端海报" />
            <div class="role-body">
              <h3>我是学生</h3>
              <p>按科目、年级、时间段筛选老师，首次免费试课，合适再继续，全程可评价。</p>
              <el-button type="success" round @click="router.push('/register')">学生注册</el-button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  min-height: 100%;
}
.hero {
  background:
    radial-gradient(900px 400px at 85% -20%, rgba(47, 124, 246, 0.16), transparent 60%),
    radial-gradient(700px 360px at -10% 110%, rgba(29, 158, 117, 0.12), transparent 60%),
    linear-gradient(180deg, #f7faff 0%, #eef4ff 100%);
  padding: 90px 0 80px;
}
.container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 20px;
}
.badge {
  display: inline-block;
  font-size: 13px;
  color: #2f7cf6;
  background: #e5efff;
  border: 1px solid #d3e3fb;
  padding: 5px 14px;
  border-radius: 999px;
  margin-bottom: 20px;
}
.hero h1 {
  font-size: 40px;
  line-height: 1.35;
  color: #1d2740;
  font-weight: 700;
  margin-bottom: 18px;
}
.hero h1 b {
  color: #2f7cf6;
  font-weight: 700;
}
.sub {
  color: #5a6478;
  font-size: 16px;
  max-width: 520px;
  margin-bottom: 32px;
}
.cta {
  display: flex;
  gap: 12px;
}
.steps {
  padding: 60px 0;
  background: #fff;
}
.steps h2 {
  text-align: center;
  font-size: 24px;
  color: #1d2740;
  margin-bottom: 36px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.card {
  background: #fafcff;
  border: 1px solid #eef1f6;
  border-radius: 14px;
  padding: 26px 24px;
}
.no {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #2f7cf6;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-bottom: 14px;
}
.card h3 {
  font-size: 16px;
  color: #1d2740;
  margin-bottom: 8px;
}
.card p {
  font-size: 14px;
  color: #6b7488;
  line-height: 1.7;
}
.roles {
  padding: 60px 0 70px;
  background: linear-gradient(180deg, #f7faff 0%, #eef4ff 100%);
}
.roles h2 {
  text-align: center;
  font-size: 24px;
  color: #1d2740;
  margin-bottom: 10px;
}
.roles-sub {
  text-align: center;
  color: #6b7488;
  font-size: 14.5px;
  margin-bottom: 32px;
}
.role-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}
.role-card {
  display: flex;
  gap: 20px;
  background: #fff;
  border: 1px solid #eef1f6;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 6px 20px rgba(47, 124, 246, 0.06);
}
.role-card img {
  width: 150px;
  height: 267px;
  object-fit: contain;
  background: #f7faff;
  border-radius: 12px;
  flex: 0 0 auto;
}
.role-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.role-body h3 {
  font-size: 17px;
  color: #1d2740;
  margin-bottom: 10px;
}
.role-body p {
  font-size: 14px;
  color: #6b7488;
  line-height: 1.8;
  margin-bottom: 18px;
}
@media (max-width: 820px) {
  .role-cards {
    grid-template-columns: 1fr;
  }
}
</style>
