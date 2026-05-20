<template>
  <div class="ai-assistant-page">
    <Header title="AI Assistant" />

    <button
      class="settings-btn"
      aria-label="AI settings"
      @click="showSettings = true"
    >
      <Icon
        icon="tabler:settings"
        :height="22"
      />
    </button>

    <div
      ref="chatContainer"
      class="chat-container"
    >
      <div
        v-if="messages.length === 0"
        class="welcome-message"
      >
        <div class="welcome-icon">
          <Icon
            icon="tabler:brain"
            :height="64"
            style="color: #7bc74d"
          />
        </div>
        <h2>Hi, I'm your AI assistant! 🌱</h2>
        <p>I'm here to help you with growing your plants.</p>
        <div class="welcome-features">
          <div class="feature">
            <Icon
              icon="tabler:messages"
              :height="20"
            />
            <span>Growing tips and advice</span>
          </div>
          <div class="feature">
            <Icon
              icon="tabler:camera"
              :height="20"
            />
            <span>Diagnosis from photos</span>
          </div>
          <div class="feature">
            <Icon
              icon="tabler:bulb"
              :height="20"
            />
            <span>Problem solving</span>
          </div>
        </div>

        <button
          v-if="ai.keyLoaded.value && !ai.hasKey()"
          class="connect-hint"
          @click="showSettings = true"
        >
          <Icon
            icon="tabler:plug-connected"
            :height="18"
          />
          <span>Connect a free AI key for smarter answers</span>
        </button>
      </div>

      <div class="messages">
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message', message.type]"
        >
          <div
            v-if="message.type === 'bot'"
            class="message-avatar"
          >
            <Icon
              icon="tabler:brain"
              height="20"
            />
          </div>

          <div class="message-content">
            <div
              v-if="message.image"
              class="message-image"
            >
              <img
                :src="message.image"
                alt="Uploaded image"
              >
            </div>
            <div class="message-text">
              {{ message.text }}
            </div>
            <div class="message-time">
              {{ message.time }}
            </div>
          </div>

          <div
            v-if="message.type === 'user'"
            class="message-avatar"
          >
            <Icon
              icon="tabler:user"
              height="20"
            />
          </div>
        </div>

        <div
          v-if="isTyping"
          class="message bot typing-indicator"
        >
          <div class="message-avatar">
            <Icon
              icon="tabler:brain"
              height="20"
            />
          </div>
          <div class="message-content">
            <div class="typing-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="messages.length === 0"
      class="quick-questions"
    >
      <div class="quick-question-title">
        Quick Questions:
      </div>
      <div class="quick-question-list">
        <button
          v-for="(question, index) in quickQuestions"
          :key="index"
          class="quick-question-btn"
          @click="sendQuickQuestion(question)"
        >
          <Icon
            :icon="question.icon"
            :height="18"
          />
          <span>{{ question.text }}</span>
        </button>
      </div>
    </div>

    <div class="input-container">
      <div
        v-if="uploadedImage"
        class="uploaded-preview"
      >
        <img
          :src="uploadedImage"
          alt="Preview"
        >
        <button
          class="remove-image"
          aria-label="Remove image"
          @click="removeImage"
        >
          <Icon
            icon="tabler:x"
            :height="16"
          />
        </button>
      </div>

      <div class="input-wrapper">
        <button
          class="image-btn"
          :class="{ active: uploadedImage }"
          aria-label="Upload photo"
          @click="pickImage"
        >
          <Icon
            icon="tabler:camera"
            :height="22"
          />
        </button>

        <input
          v-model="inputMessage"
          type="text"
          placeholder="Ask anything..."
          class="message-input"
          @keyup.enter="sendMessage"
        >

        <button
          class="send-btn"
          :disabled="!canSend"
          aria-label="Send message"
          @click="sendMessage"
        >
          <Icon
            icon="tabler:send"
            :height="22"
          />
        </button>
      </div>
    </div>

    <!-- API key settings -->
    <div
      v-if="showSettings"
      class="settings-overlay"
      @click.self="showSettings = false"
    >
      <div class="settings-sheet">
        <div class="settings-header">
          <h3>AI Settings</h3>
          <button
            class="close-btn"
            aria-label="Close"
            @click="showSettings = false"
          >
            <Icon
              icon="tabler:x"
              :height="20"
            />
          </button>
        </div>

        <p class="settings-desc">
          BudBuddy uses Google Gemini for AI answers. Paste your free API key to unlock
          smart, photo-aware advice. Without a key the assistant still answers from a
          built-in offline guide.
        </p>

        <label
          class="settings-label"
          for="gemini-key"
        >Gemini API key</label>
        <input
          id="gemini-key"
          v-model="keyInput"
          type="password"
          class="settings-input"
          placeholder="AIza..."
          autocomplete="off"
        >

        <a
          class="settings-getkey"
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener"
        >
          <Icon
            icon="tabler:external-link"
            :height="16"
          />
          <span>Get a free key at aistudio.google.com</span>
        </a>

        <button
          class="settings-save"
          @click="saveApiKey"
        >
          <Icon
            icon="tabler:device-floppy"
            :height="18"
          />
          <span>Save</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import Header from '~/components/Header.vue'
import { useHead } from '#imports'
import { useAiAssistant, type ChatTurn } from '~/composables/useAiAssistant'

useHead({ title: 'AI Assistant' })

const ai = useAiAssistant()
const showSettings = ref(false)
const keyInput = ref('')

onMounted(async () => {
  await ai.loadKey()
  keyInput.value = ai.apiKey.value
})

const saveApiKey = async () => {
  await ai.saveKey(keyInput.value)
  showSettings.value = false
}

interface Message {
  type: 'user' | 'bot'
  text: string
  time: string
  image?: string
}

interface QuickQuestion {
  text: string
  icon: string
}

const messages = ref<Message[]>([])
const inputMessage = ref('')
const uploadedImage = ref<string | null>(null)
const isTyping = ref(false)
const chatContainer = ref<HTMLElement | null>(null)

const quickQuestions: QuickQuestion[] = [
  { text: 'How to recognize nutrient deficiency?', icon: 'tabler:leaf-off' },
  { text: 'When to transplant plant?', icon: 'tabler:plant' },
  { text: 'Optimal pH value?', icon: 'tabler:droplet' },
  { text: 'What are growth stages?', icon: 'tabler:timeline' }
]

const canSend = computed(() => {
  return inputMessage.value.trim().length > 0 || uploadedImage.value !== null
})

const getCurrentTime = () => {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

const scrollToBottom = async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

const sendMessage = async () => {
  if (!canSend.value) return

  const userMessage: Message = {
    type: 'user',
    text: inputMessage.value,
    time: getCurrentTime(),
    image: uploadedImage.value || undefined
  }

  messages.value.push(userMessage)
  const userQuestion = inputMessage.value
  const userImage = uploadedImage.value
  inputMessage.value = ''
  uploadedImage.value = null

  await scrollToBottom()
  isTyping.value = true

  // If the user supplied a Gemini key, use the real AI. Otherwise fall back
  // to the built-in offline answers so the feature still works without a key.
  if (ai.hasKey()) {
    try {
      const history: ChatTurn[] = messages.value.map(m => ({
        role: m.type === 'user' ? 'user' : 'model',
        text: m.text,
        imageBase64: m.image
      }))
      const answer = await ai.ask(history)
      isTyping.value = false
      messages.value.push({ type: 'bot', text: answer, time: getCurrentTime() })
    } catch (err) {
      isTyping.value = false
      const code = err instanceof Error ? err.message : ''
      let text: string
      if (code === 'INVALID_API_KEY') {
        text = '🔑 Your Gemini API key seems invalid or out of quota. Tap the ⚙️ icon to update it.'
      } else if (code === 'NO_API_KEY') {
        text = getBotResponse(userQuestion)
      } else {
        text = '⚠️ I couldn\'t reach the AI service. Check your connection and try again.\n\n' + getBotResponse(userQuestion)
      }
      messages.value.push({ type: 'bot', text, time: getCurrentTime() })
    }
    await scrollToBottom()
    return
  }

  // Offline fallback (no API key configured)
  setTimeout(() => {
    isTyping.value = false
    void userImage
    messages.value.push({
      type: 'bot',
      text: getBotResponse(userQuestion),
      time: getCurrentTime()
    })
    scrollToBottom()
  }, 900)
}

const sendQuickQuestion = (question: QuickQuestion) => {
  inputMessage.value = question.text
  sendMessage()
}

const getBotResponse = (question: string): string => {
  const lowerQuestion = question.toLowerCase()

  if (
    lowerQuestion.includes('živin')
    || lowerQuestion.includes('deficiency')
    || lowerQuestion.includes('nutrient')
  ) {
    return (
      '🌿 Nutrient deficiencies show in different ways:\n\n'
      + '• Yellow leaves (lower) = Nitrogen (N) deficiency\n'
      + '• Brown leaf edges = Potassium (K) deficiency\n'
      + '• Purple tint = Phosphorus (P) deficiency\n'
      + '• Light green leaves = Magnesium (Mg) deficiency\n\n'
      + 'I recommend taking a photo of your plant for a more accurate diagnosis! 📸'
    )
  }

  if (
    lowerQuestion.includes('přesad')
    || lowerQuestion.includes('transplant')
  ) {
    return (
      '🪴 Transplanting tips:\n\n'
      + '• Seedling: after 2–3 weeks or when 3–4 true leaves appear\n'
      + '• Vegetative: when roots fill the container\n'
      + '• Best time: before watering (dry soil)\n'
      + '• After transplant: less water for the first few days\n\n'
      + 'Avoid transplanting during flowering! 🌸'
    )
  }

  if (lowerQuestion.includes('ph')) {
    return (
      '💧 Optimal pH values:\n\n'
      + '• Soil: 6.0 – 7.0\n'
      + '• Hydroponics: 5.5 – 6.5\n'
      + '• Coco: 5.5 – 6.5\n\n'
      + 'Wrong pH prevents nutrient uptake even if nutrients are available! Check regularly. 📊'
    )
  }

  if (
    lowerQuestion.includes('fáze')
    || lowerQuestion.includes('stage')
    || lowerQuestion.includes('growth')
  ) {
    return (
      '🌱 Growth stages:\n\n'
      + '1. Germination (1–7 days)\n'
      + '2. Seedling (2–3 weeks)\n'
      + '3. Vegetative (3–16 weeks)\n'
      + '4. Pre-flower (1–2 weeks)\n'
      + '5. Flowering (6–12 weeks)\n'
      + '6. Ripening (1–2 weeks)\n\n'
      + 'Each stage has different needs! 🌿'
    )
  }

  return (
    '🌿 Great question! As your AI assistant I can help with:\n\n'
    + '• Diagnosing problems from photos\n'
    + '• Nutrition and pH advice\n'
    + '• Lighting and ventilation tips\n'
    + '• Identifying growth stages\n\n'
    + 'Try sending me a photo of your plant or ask a more specific question! 📸'
  )
}

const pickImage = () => {
  // Simulace výběru obrázku - v produkci použij Capacitor Camera API
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        uploadedImage.value = event.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }
  input.click()
}

const removeImage = () => {
  uploadedImage.value = null
}
</script>

<style scoped>
.ai-assistant-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #0a0a0a;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.welcome-message {
  text-align: center;
  padding: 40px 20px;
  animation: fadeIn 0.5s ease;
}

.welcome-icon {
  margin-bottom: 20px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.welcome-message h2 {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12px;
}

.welcome-message p {
  font-size: 15px;
  color: #999;
  margin-bottom: 30px;
}

.welcome-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 280px;
  margin: 0 auto;
}

.feature {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(123, 199, 77, 0.1);
  border: 1px solid rgba(123, 199, 77, 0.2);
  border-radius: 12px;
  color: #7bc74d;
  font-size: 14px;
  font-weight: 500;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.message {
  display: flex;
  gap: 10px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(123, 199, 77, 0.3);
}

.message.user .message-avatar {
  background: linear-gradient(135deg, #444 0%, #333 100%);
}

.message-content {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 18px;
  background: rgba(30, 30, 30, 0.9);
  border: 1px solid rgba(123, 199, 77, 0.15);
}

.message.user .message-content {
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  border: none;
}

.message-image {
  margin-bottom: 8px;
  border-radius: 12px;
  overflow: hidden;
}

.message-image img {
  width: 100%;
  display: block;
}

.message-text {
  color: #fff;
  font-size: 15px;
  line-height: 1.5;
  white-space: pre-line;
  word-wrap: break-word;
}

.message-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 6px;
}

.message.user .message-time {
  text-align: right;
}

.typing-indicator {
  opacity: 0.7;
}

.typing-dots {
  display: flex;
  gap: 4px;
  padding: 8px 0;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #7bc74d;
  animation: typing 1.4s infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}

.quick-questions {
  padding: 0 16px 16px;
}

.quick-question-title {
  font-size: 13px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.quick-question-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-question-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(30, 30, 30, 0.9);
  border: 1px solid rgba(123, 199, 77, 0.2);
  border-radius: 14px;
  color: #7bc74d;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.quick-question-btn:active {
  transform: scale(0.98);
  background: rgba(123, 199, 77, 0.15);
}

.input-container {
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom)) 16px;
  background: linear-gradient(
    180deg,
    rgba(15, 15, 15, 0.95) 0%,
    rgba(10, 10, 10, 0.95) 100%
  );
  border-top: 1px solid rgba(123, 199, 77, 0.15);
  backdrop-filter: blur(20px);
}

.uploaded-preview {
  position: relative;
  margin-bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
  max-width: 150px;
}

.uploaded-preview img {
  width: 100%;
  display: block;
}

.remove-image {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.8);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(30, 30, 30, 0.9);
  border: 1px solid rgba(123, 199, 77, 0.2);
  border-radius: 24px;
  padding: 8px 8px 8px 12px;
}

.image-btn {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: #7bc74d;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.image-btn:active {
  transform: scale(0.9);
  background: rgba(123, 199, 77, 0.15);
}

.image-btn.active {
  background: rgba(123, 199, 77, 0.2);
}

.message-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 15px;
  padding: 10px 8px;
}

.message-input::placeholder {
  color: #666;
}

.send-btn {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 12px rgba(123, 199, 77, 0.3);
  -webkit-tap-highlight-color: transparent;
}

.send-btn:active {
  transform: scale(0.9);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.settings-btn {
  position: absolute;
  top: max(env(safe-area-inset-top), 12px);
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(123, 199, 77, 0.15);
  border: 1px solid rgba(123, 199, 77, 0.2);
  color: #7bc74d;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  -webkit-tap-highlight-color: transparent;
}

.settings-btn:active {
  transform: scale(0.92);
}

.connect-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 20px auto 0;
  padding: 12px 18px;
  max-width: 320px;
  background: rgba(123, 199, 77, 0.12);
  border: 1px dashed rgba(123, 199, 77, 0.4);
  border-radius: 14px;
  color: #7bc74d;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 50;
  animation: fadeIn 0.2s ease;
}

.settings-sheet {
  width: 100%;
  max-width: 480px;
  background: #141414;
  border: 1px solid rgba(123, 199, 77, 0.2);
  border-radius: 20px 20px 0 0;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.settings-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.settings-desc {
  font-size: 13px;
  line-height: 1.5;
  color: #999;
  margin-bottom: 16px;
}

.settings-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #7bc74d;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.settings-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(30, 30, 30, 0.9);
  border: 1px solid rgba(123, 199, 77, 0.25);
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  outline: none;
}

.settings-input:focus {
  border-color: #7bc74d;
}

.settings-getkey {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 12px 0 20px;
  color: #7bc74d;
  font-size: 13px;
  text-decoration: none;
}

.settings-save {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  border: none;
  border-radius: 14px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.settings-save:active {
  transform: scale(0.98);
}
</style>
