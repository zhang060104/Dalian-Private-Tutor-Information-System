<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  UserFilled,
  Check,
  StarFilled,
  Medal,
  ChatDotRound,
  Lock,
  CircleCheck,
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
    title: '双向选择',
    desc: '老师查看学生信息并投递简历，学生确认意向，双方互选才正式匹配。',
  },
  {
    icon: Lock,
    title: '定金保障',
    desc: '双方各缴定金防止单方面逃单，订单全程受平台监管，权益有保障。',
  },
  {
    icon: CircleCheck,
    title: '平台担保',
    desc: '老师缴纳信息费后解锁对方联系方式；授课结束退还全额押金。',
  },
]

const STEPS = [
  { no: '01', title: '入驻注册', desc: '老师、学生扫码入驻，完善个人资料与一周空余时间' },
  { no: '02', title: '双向选择', desc: '老师查看学生信息并投递简历，学生确认接受意向' },
  { no: '03', title: '定金锁定', desc: '双方缴纳定金，确认订单明细；老师缴纳信息费后解锁对方联系方式' },
  { no: '04', title: '试课开课', desc: '安排免费试课，通过即正式授课；未通过退还一半定金与信息费' },
]

const FAQS = [
  {
    q: '你们如何保证教员质量？',
    a: '每位教员都经过学历核验、教学经验背调与现场试讲三重审核，正式录用率低于 20%，从源头保证师资靠谱。',
  },
  {
    q: '试课收费吗？',
    a: '试课免费。试课通过即正式开课；若未通过，退还双方一半定金与老师一半信息费并取消订单，双方损失可控。',
  },
  {
    q: '为什么要缴纳定金？',
    a: '师生双方各缴定金，用于防止单方面逃单。授课期间定金保留，双方确认授课到期后全额退回。',
  },
  {
    q: '信息费是什么？',
    a: '老师简历通过后需缴纳信息费（约为授课第一周工资），缴纳后才会向双方展示对方的联系方式与地址，防止绕过平台私下交易。',
  },
  {
    q: '课时费怎么结算？',
    a: '授课期间可选择私下结算或走平台结算（私下结算需学生发起、老师同意）。双方确认授课到期后退回全额押金。',
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
            师生双向选择、双方定金保障——试课满意再开课。
          </p>
          <div class="hero-actions">
            <el-button type="primary" size="large" round @click="router.push('/tutors')">
              浏览教员库
              <el-icon class="btn-icon"><ArrowRight /></el-icon>
            </el-button>
            <el-button size="large" round plain @click="router.push('/register')">入驻平台</el-button>
          </div>
          <div class="hero-trust">
            <span><el-icon color="#16a34a"><Check /></el-icon>三审严选师资</span>
            <span><el-icon color="#16a34a"><Check /></el-icon>双向选择</span>
            <span><el-icon color="#16a34a"><Check /></el-icon>定金保障</span>
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
            <span>双向选择 · 定金保障 · 试课满意再开课</span>
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
          <p class="section-desc">从筛选教员到订单保障，我们把每个环节都做实，让家长和老师都省心、放心。</p>
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

    <!-- ============ 服务流程 ============ -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div class="section-eyebrow">HOW IT WORKS</div>
          <h2 class="section-title">四步找到好家教</h2>
          <p class="section-desc">从入驻到开课，双向选择、定金保障，全程透明可追溯。</p>
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
          <h2 class="cta-title">双向选择，找到真正适合孩子的好老师</h2>
          <p class="cta-desc">入驻平台，完善资料，与心仪老师双向匹配</p>
        </div>
        <div class="cta-actions">
          <el-button size="large" round color="#fff" text-color="#2f7cf6" @click="router.push('/register')">
            立即入驻
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
