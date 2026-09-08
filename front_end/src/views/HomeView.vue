<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import { useSystemStore, ROLE_HOME } from '@/stores/system'

const router = useRouter()
const store = useSystemStore()

/** 登录/入驻后的下一步去向 */
function goNext() {
  if (store.current && store.current.role !== 'admin') {
    router.push(ROLE_HOME[store.current.role as 'teacher' | 'student'])
    return
  }
  router.push('/login')
}

/** 基本使用引导：怎么用这个平台（点到为止，不展开平台内部机制） */
const STEPS = [
  { no: '01', title: '入驻 & 填资料', desc: '老师 / 学生扫码入驻，完善个人资料与一周空余时间' },
  { no: '02', title: '逛双选大厅', desc: '登录后进入双选大厅，浏览老师与学生信息' },
  { no: '03', title: '双向投递简历', desc: '对心仪的对象投递简历，互相认可即达成匹配' },
  { no: '04', title: '联系授课', desc: '匹配后在资料页查看对方信息，双方约课联系' },
]
</script>

<template>
  <div class="home">
    <!-- ============ Hero ============ -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <div class="hero-eyebrow">大连本地 · 一对一上门 / 在线家教</div>
          <h1 class="hero-title">
            好老师，<br /><span class="grad-text">从一次认真的匹配开始</span>
          </h1>
          <p class="hero-desc">
            老师与学生双向选择，把自己的资料与空余时间放上来，互相投递简历。
          </p>
          <div class="hero-actions">
            <el-button type="primary" size="large" round @click="goNext">
              登录 / 入驻
              <el-icon class="btn-icon"><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 使用引导 ============ -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2 class="section-title">怎么使用</h2>
          <p class="section-desc">简单四步，开始一次家教匹配。</p>
        </div>
        <div class="steps">
          <div v-for="(s, i) in STEPS" :key="s.no" class="step">
            <div class="step-no">{{ s.no }}</div>
            <div class="step-title">{{ s.title }}</div>
            <p class="step-desc">{{ s.desc }}</p>
            <div v-if="i < STEPS.length - 1" class="step-arrow">→</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ CTA ============ -->
    <section class="cta">
      <div class="container cta-inner">
        <div>
          <h2 class="cta-title">准备好了吗？</h2>
          <p class="cta-desc">老师或学生，都可以直接入驻开始匹配。</p>
        </div>
        <div class="cta-actions">
          <el-button size="large" round color="#fff" text-color="#2f7cf6" @click="router.push('/register')">
            立即入驻
            <el-icon class="btn-icon"><ArrowRight /></el-icon>
          </el-button>
          <el-button size="large" round plain color="#fff" @click="router.push('/about')">了解平台</el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ============ Hero ============ */
.hero {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(1000px 500px at 85% -10%, rgba(47, 124, 246, 0.14), transparent 60%),
    radial-gradient(800px 400px at -10% 110%, rgba(34, 193, 166, 0.12), transparent 60%),
    linear-gradient(180deg, #f4f8ff 0%, #ffffff 100%);
}

.hero-inner {
  position: relative;
  padding-top: 96px;
  padding-bottom: 110px;
  text-align: center;
}

.hero-eyebrow {
  display: inline-block;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-color-dark);
  background: rgba(47, 124, 246, 0.1);
  padding: 6px 16px;
  border-radius: 999px;
  margin-bottom: 22px;
}

.hero-title {
  font-size: 44px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.015em;
  margin-bottom: 18px;
}

.grad-text {
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-desc {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.9;
  max-width: 560px;
  margin: 0 auto 30px;
}

.hero-actions {
  display: flex;
  justify-content: center;
}

.btn-icon {
  margin-left: 4px;
}

/* ============ 使用引导 ============ */
.steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  position: relative;
}

.step {
  position: relative;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 26px 22px;
  text-align: left;
}

.step-no {
  font-size: 30px;
  font-weight: 800;
  color: var(--brand-color-light);
  -webkit-text-stroke: 1.5px var(--brand-color);
  letter-spacing: 0.02em;
  margin-bottom: 12px;
}

.step-title {
  font-size: 16.5px;
  font-weight: 700;
  margin-bottom: 6px;
}

.step-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.step-arrow {
  position: absolute;
  right: -16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--border-strong);
  font-size: 18px;
  z-index: 2;
}

/* ============ CTA ============ */
.cta {
  background: var(--brand-gradient);
}

.cta-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-top: 46px;
  padding-bottom: 46px;
  flex-wrap: wrap;
}

.cta-title {
  color: #fff;
  font-size: 25px;
  font-weight: 700;
  margin-bottom: 6px;
}

.cta-desc {
  color: rgba(255, 255, 255, 0.85);
  font-size: 14.5px;
}

.cta-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 960px) {
  .steps {
    grid-template-columns: 1fr 1fr;
  }

  .step-arrow {
    display: none;
  }
}

@media (max-width: 640px) {
  .hero-inner {
    padding-top: 56px;
    padding-bottom: 72px;
  }

  .hero-title {
    font-size: 30px;
  }

  .steps {
    grid-template-columns: 1fr;
  }
}
</style>
