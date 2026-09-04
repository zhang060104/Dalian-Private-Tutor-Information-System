<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  UserFilled,
  Check,
  StarFilled,
  Medal,
  Reading,
  ChatDotRound,
  EditPen,
} from '@element-plus/icons-vue'
import { TUTORS } from '@/data/tutors'
import { CENTER_CONTACT } from '@/types'
import TutorCard from '@/components/TutorCard.vue'

const router = useRouter()

const FEATURES = [
  {
    icon: Medal,
    title: '师资严选',
    desc: '学历、教学经验、试讲能力三重审核，通过率不足 20%，不合格一律不录用。',
  },
  {
    icon: UserFilled,
    title: '精准匹配',
    desc: '根据学生年级、科目短板与性格特点，一对一匹配最合适的教员。',
  },
  {
    icon: Check,
    title: '免费试听',
    desc: '首次试听不收费，满意再付费，给孩子和老师互相了解的机会。',
  },
  {
    icon: EditPen,
    title: '按次付费',
    desc: '按课时结算，无预收大额费用，随时可停，家长零风险。',
  },
]

const STEPS = [
  { no: '01', title: '提交需求', desc: '在线填写年级、科目与时间，或直接电话沟通' },
  { no: '02', title: '匹配教员', desc: '顾问 2 小时内响应，推荐 2-3 位合适教员供选择' },
  { no: '03', title: '免费试听', desc: '安排试听课，家长孩子满意后再正式开课' },
  { no: '04', title: '效果跟踪', desc: '专属顾问定期回访，跟进成绩与学习状态' },
]

const FAQS = [
  {
    q: '你们如何保证教员质量？',
    a: '每位教员都经过学历核验、教学经验背调与现场试讲三重审核，正式录用率低于 20%。同时我们提供免费试听，家长和孩子可直观感受教学水平。',
  },
  {
    q: '试听课收费吗？',
    a: '首次试听完全免费，不收取任何费用。试听满意后按次付费开课，无任何预收或捆绑要求。',
  },
  {
    q: '可以上门授课吗？覆盖哪些区域？',
    a: '可以。我们提供上门与在线两种方式，上门服务覆盖大连市内各区，具体以教员可服务范围为准，可在筛选时查看。',
  },
  {
    q: '上课后不满意可以换老师吗？',
    a: '可以。如对教学风格或效果不满意，可随时联系您的专属顾问免费更换教员，直到匹配到合适为止。',
  },
  {
    q: '课时费怎么结算？',
    a: '按次（课时）结算，每次课后支付，无预收大额费用。费用透明，课前与您确认课时单价与时长。',
  },
]

const activeFaq = ref(0)
const previewTutors = TUTORS.slice(0, 3)
</script>

<template>
  <div class="home">
    <!-- ============ Hero ============ -->
    <section class="hero">
      <div class="hero-bg-deco deco-1"></div>
      <div class="hero-bg-deco deco-2"></div>
      <div class="container hero-inner">
        <div class="hero-copy">
          <div class="hero-eyebrow">大连本地 · 一对一上门/在线家教</div>
          <h1 class="hero-title">
            让每个孩子
            <span class="grad-text">都遇见好老师</span>
          </h1>
          <p class="hero-desc">
            大连私人家教中心严选名校师资，覆盖小学至高中全科目。
            免费试听、按次付费、不满意随时换——把选择权交给家长。
          </p>
          <div class="hero-actions">
            <el-button type="primary" size="large" round @click="router.push('/contact')">
              免费预约试听
              <el-icon class="btn-icon"><ArrowRight /></el-icon>
            </el-button>
            <el-button size="large" round plain @click="router.push('/tutors')">浏览教员库</el-button>
          </div>
          <div class="hero-trust">
            <span><el-icon color="#16a34a"><Check /></el-icon>三审严选师资</span>
            <span><el-icon color="#16a34a"><Check /></el-icon>免费试听</span>
            <span><el-icon color="#16a34a"><Check /></el-icon>按次付费</span>
          </div>
        </div>

        <div class="hero-card-panel">
          <div class="stat-grid">
            <div class="stat-item">
              <div class="stat-num">500<span class="stat-plus">+</span></div>
              <div class="stat-label">在库认证教员</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">8<span class="stat-plus">k</span></div>
              <div class="stat-label">累计服务家庭</div>
            </div>
            <div class="stat-item">
              <div class="stat-num">96<span class="stat-plus">%</span></div>
              <div class="stat-label">家长满意度</div>
            </div>
          </div>
          <div class="hero-card-foot">
            <el-icon color="#ffb020"><StarFilled /></el-icon>
            <span>试听满意率 {{ previewTutors[0].rating.toFixed(1) }}+ · 全程跟踪学习效果</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 为什么选我们 ============ -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div class="section-eyebrow">OUR ADVANTAGES</div>
          <h2 class="section-title">为什么选择我们</h2>
          <p class="section-desc">从筛选教员到课后跟踪，我们把每个环节都做实，让家长省心、放心。</p>
        </div>
        <div class="feature-grid">
          <div v-for="f in FEATURES" :key="f.title" class="feature-card">
            <div class="feature-icon">
              <el-icon :size="26"><component :is="f.icon" /></el-icon>
            </div>
            <div class="feature-title">{{ f.title }}</div>
            <p class="feature-desc">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 明星教员 ============ -->
    <section class="section section--subtle">
      <div class="container">
        <div class="section-head">
          <div class="section-eyebrow">STAR TUTORS</div>
          <h2 class="section-title">明星教员推荐</h2>
          <p class="section-desc">从认证教员库中精选高口碑老师，更多师资可在教员库中按科目筛选。</p>
        </div>
        <div class="tutor-grid">
          <TutorCard v-for="t in previewTutors" :key="t.id" :tutor="t" />
        </div>
        <div class="section-more">
          <el-button round @click="router.push('/tutors')">
            查看全部教员
            <el-icon class="btn-icon"><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>
    </section>

    <!-- ============ 找家教流程 ============ -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div class="section-eyebrow">HOW IT WORKS</div>
          <h2 class="section-title">四步找到好家教</h2>
          <p class="section-desc">流程透明简单，最快当天即可安排试听。</p>
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

    <!-- ============ FAQ ============ -->
    <section class="section section--subtle">
      <div class="container">
        <div class="section-head">
          <div class="section-eyebrow">FAQ</div>
          <h2 class="section-title">常见问题</h2>
        </div>
        <div class="faq-wrap">
          <el-collapse v-model="activeFaq" accordion>
            <el-collapse-item v-for="(f, i) in FAQS" :key="i" :name="i">
              <template #title>
                <span class="faq-q">{{ f.q }}</span>
              </template>
              <p class="faq-a">{{ f.a }}</p>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
    </section>

    <!-- ============ CTA ============ -->
    <section class="cta">
      <div class="container cta-inner">
        <div>
          <h2 class="cta-title">孩子成绩提升，从一次免费试听开始</h2>
          <p class="cta-desc">提交需求，顾问将在 2 小时内为您匹配合适教员</p>
        </div>
        <div class="cta-actions">
          <el-button size="large" round color="#fff" text-color="#2f7cf6" @click="router.push('/contact')">
            在线提交需求
            <el-icon class="btn-icon"><ArrowRight /></el-icon>
          </el-button>
          <div class="cta-phone">
            <el-icon><ChatDotRound /></el-icon>
            <a :href="`tel:${CENTER_CONTACT.phone}`">{{ CENTER_CONTACT.phone }}</a>
          </div>
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

.hero-bg-deco {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
}

.deco-1 {
  width: 320px;
  height: 320px;
  background: rgba(47, 124, 246, 0.14);
  top: -120px;
  right: 8%;
}

.deco-2 {
  width: 240px;
  height: 240px;
  background: rgba(34, 193, 166, 0.16);
  bottom: -100px;
  left: 4%;
}

.hero-inner {
  position: relative;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 56px;
  align-items: center;
  padding-top: 72px;
  padding-bottom: 96px;
}

.hero-eyebrow {
  display: inline-block;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-color-dark);
  background: rgba(47, 124, 246, 0.1);
  padding: 6px 16px;
  border-radius: 999px;
  margin-bottom: 20px;
}

.hero-title {
  font-size: 46px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.015em;
  margin-bottom: 20px;
}

.grad-text {
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-desc {
  font-size: 16.5px;
  color: var(--text-secondary);
  line-height: 1.9;
  max-width: 520px;
  margin-bottom: 28px;
}

.hero-actions {
  display: flex;
  gap: 14px;
  margin-bottom: 26px;
}

.btn-icon {
  margin-left: 2px;
}

.hero-trust {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  font-size: 13.5px;
  color: var(--text-secondary);
}

.hero-trust span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

/* Hero 右侧数据面板 */
.hero-card-panel {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 34px 30px 24px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 8px 4px;
}

.stat-num {
  font-size: 34px;
  font-weight: 800;
  background: var(--brand-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1.2;
}

.stat-plus {
  font-size: 20px;
}

.stat-label {
  font-size: 12.5px;
  color: var(--text-tertiary);
  margin-top: 6px;
}

.hero-card-foot {
  margin-top: 18px;
  border-top: 1px dashed var(--border-color);
  padding-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--text-secondary);
}

/* ============ 特色 ============ */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
}

.feature-card {
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 30px 24px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.feature-icon {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  background: var(--brand-color-light);
  color: var(--brand-color);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}

.feature-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 8px;
}

.feature-desc {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.8;
}

/* ============ 教员 ============ */
.tutor-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
}

.section-more {
  text-align: center;
  margin-top: 34px;
}

/* ============ 流程 ============ */
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

/* ============ FAQ ============ */
.faq-wrap {
  max-width: 820px;
  margin: 0 auto;
  background: #fff;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  padding: 8px 22px;
}

.faq-q {
  font-weight: 600;
}

.faq-a {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.9;
  padding: 0 8px 12px;
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
  gap: 20px;
  flex-wrap: wrap;
}

.cta-phone {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.cta-phone a {
  color: #fff;
}

@media (max-width: 960px) {
  .hero-inner {
    grid-template-columns: 1fr;
    padding-top: 48px;
    padding-bottom: 64px;
  }

  .feature-grid,
  .tutor-grid {
    grid-template-columns: 1fr 1fr;
  }

  .steps {
    grid-template-columns: 1fr 1fr;
  }

  .step-arrow {
    display: none;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 32px;
  }

  .feature-grid,
  .tutor-grid,
  .steps {
    grid-template-columns: 1fr;
  }
}
</style>
