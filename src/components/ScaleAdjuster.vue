<script setup lang="ts">
import { computed } from 'vue'
import { useImageStore } from '@/stores/imageStore'

const imageStore = useImageStore()
const usePerImageOptions = computed(() => !!imageStore.selectedImage?.compressOptions)
const activeOptions = computed(() => imageStore.selectedImage?.compressOptions || imageStore.compressOptions)

const updateOptions = (options: Parameters<typeof imageStore.updateCompressOptions>[0]) => {
  if (usePerImageOptions.value) {
    imageStore.updateSelectedImageCompressOptions(options)
  } else {
    imageStore.updateCompressOptions(options)
  }
}

const scaleEnabled = computed({
  get: () => activeOptions.value.scaleEnabled ?? false,
  set: (val: boolean) => updateOptions({ scaleEnabled: val })
})

const scalePercent = computed({
  get: () => activeOptions.value.scalePercent ?? 100,
  set: (val: number) => updateOptions({ scalePercent: val })
})

const maxWidth = computed({
  get: () => activeOptions.value.maxWidth ?? '',
  set: (val: string) => {
    const num = parseInt(val)
    updateOptions({ maxWidth: isNaN(num) ? undefined : num })
  }
})

const maxHeight = computed({
  get: () => activeOptions.value.maxHeight ?? '',
  set: (val: string) => {
    const num = parseInt(val)
    updateOptions({ maxHeight: isNaN(num) ? undefined : num })
  }
})

const presets = [
  { label: '50%', value: 50 },
  { label: '75%', value: 75 },
  { label: '100%', value: 100 }
]

const setPreset = (val: number) => {
  scalePercent.value = val
}

const onSliderChange = (e: Event) => {
  scalePercent.value = parseInt((e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="mb-5">
    <div class="section-title">尺寸调整</div>

    <!-- Enable Toggle -->
    <div class="flex items-center gap-2 mb-3">
      <button
        class="toggle-switch"
        :class="{ 'toggle-switch--active': scaleEnabled }"
        :aria-checked="scaleEnabled"
        role="switch"
        @click="scaleEnabled = !scaleEnabled"
      >
        <span class="toggle-switch__thumb" />
      </button>
      <span class="text-xs text-surface-700">{{ scaleEnabled ? '已启用' : '未启用' }}</span>
    </div>

    <template v-if="scaleEnabled">
      <!-- Scale Mode Toggle -->
      <div class="flex gap-1 mb-3">
        <button
          class="flex-1 py-1.5 rounded-md border text-[11px] font-semibold transition-all"
          :class="
            !activeOptions.maxWidth && !activeOptions.maxHeight
              ? 'border-primary-500 bg-primary-100 text-primary-600'
              : 'border-surface-200 text-surface-600 hover:border-primary-500'
          "
          @click="updateOptions({ maxWidth: undefined, maxHeight: undefined })"
        >
          比例缩放
        </button>
        <button
          class="flex-1 py-1.5 rounded-md border text-[11px] font-semibold transition-all"
          :class="
            activeOptions.maxWidth || activeOptions.maxHeight
              ? 'border-primary-500 bg-primary-100 text-primary-600'
              : 'border-surface-200 text-surface-600 hover:border-primary-500'
          "
          @click="updateOptions({ maxWidth: maxWidth || 1920, maxHeight: maxHeight || 1080 })"
        >
          最大尺寸
        </button>
      </div>

      <!-- Scale Percent Mode -->
      <template v-if="!activeOptions.maxWidth && !activeOptions.maxHeight">
        <!-- Preset Buttons -->
        <div class="flex gap-1.5 mb-3">
          <button
            v-for="preset in presets"
            :key="preset.value"
            class="flex-1 py-1.5 rounded-md border text-[11px] font-semibold transition-all"
            :class="
              scalePercent === preset.value
                ? 'border-primary-500 bg-primary-100 text-primary-600'
                : 'border-surface-200 text-surface-600 hover:border-primary-500 hover:text-primary-500'
            "
            @click="setPreset(preset.value)"
          >
            {{ preset.label }}
          </button>
        </div>

        <!-- Scale Slider -->
        <div class="relative py-2">
          <input
            type="range"
            class="w-full h-1 rounded-sm bg-surface-200 appearance-none cursor-pointer"
            :value="scalePercent"
            min="10"
            max="100"
            step="5"
            @input="onSliderChange"
          />
          <div class="flex justify-between mt-1 text-[10px] text-surface-600">
            <span>10%</span>
            <span class="font-bold text-primary-500">{{ scalePercent }}%</span>
            <span>100%</span>
          </div>
        </div>
      </template>

      <!-- Max Dimensions Mode -->
      <template v-else>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[10px] text-surface-600 mb-1 block">最大宽度</label>
            <input
              v-model="maxWidth"
              type="number"
              placeholder="1920"
              min="1"
              class="w-full px-2.5 py-1.5 rounded-md border border-surface-200 text-xs text-surface-800 outline-none focus:border-primary-500 transition-colors"
            />
          </div>
          <div>
            <label class="text-[10px] text-surface-600 mb-1 block">最大高度</label>
            <input
              v-model="maxHeight"
              type="number"
              placeholder="1080"
              min="1"
              class="w-full px-2.5 py-1.5 rounded-md border border-surface-200 text-xs text-surface-800 outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>
        <p class="text-[10px] text-surface-500 mt-1.5">
          图片将按比例缩小至不超过设定尺寸
        </p>
      </template>
    </template>
  </div>
</template>

<style scoped>
.toggle-switch {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: #d1d5db;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
  outline: none;
  padding: 0;
}

.toggle-switch:focus-visible {
  box-shadow: 0 0 0 2px #0ea5e9;
}

.toggle-switch--active {
  background: #0ea5e9;
}

.toggle-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.toggle-switch--active .toggle-switch__thumb {
  transform: translateX(16px);
}
</style>
