<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, X, Trash2, Regex } from 'lucide-vue-next';
import { useTrafficStore } from '@/stores/trafficStore';
import { useConfirm } from 'primevue/useconfirm';
// import { useToast } from 'primevue/usetoast';
import { HTTP_METHODS } from '@shared/types';

const trafficStore = useTrafficStore();
const confirm = useConfirm();
// const toast = useToast();

const searchQuery = ref('');
const useRegex = ref(false);
const searchInBody = ref(false);
const searchInHeaders = ref(false);
const selectedMethods = ref<string[]>([]);
const selectedStatuses = ref<string[]>([]);
const minSize = ref<number | null>(null);
const maxSize = ref<number | null>(null);
const minDuration = ref<number | null>(null);
const maxDuration = ref<number | null>(null);

const STATUS_OPTIONS = ['2xx', '3xx', '4xx', '5xx'];

const uniqueHosts = computed(() => trafficStore.uniqueHosts);

const regexError = computed(() => {
  if (!useRegex.value || !searchQuery.value) return null;
  try {
    new RegExp(searchQuery.value, 'i');
    return null;
  } catch (e) {
    return 'Invalid regex pattern';
  }
});

function applyFilters() {
  trafficStore.updateFilter({
    searchQuery: searchQuery.value,
    methods: selectedMethods.value.length > 0 ? selectedMethods.value : undefined,
    statusCodes: selectedStatuses.value.length > 0 ? selectedStatuses.value : undefined,
    useRegex: useRegex.value,
    searchInBody: searchInBody.value,
    searchInHeaders: searchInHeaders.value,
    minSize: minSize.value,
    maxSize: maxSize.value,
    minDuration: minDuration.value,
    maxDuration: maxDuration.value,
  });
}

function toggleMethod(method: string) {
  const idx = selectedMethods.value.indexOf(method);
  if (idx > -1) {
    selectedMethods.value.splice(idx, 1);
  } else {
    selectedMethods.value.push(method);
  }
  applyFilters();
}

function toggleStatus(status: string) {
  const idx = selectedStatuses.value.indexOf(status);
  if (idx > -1) {
    selectedStatuses.value.splice(idx, 1);
  } else {
    selectedStatuses.value.push(status);
  }
  applyFilters();
}

function clearFilters() {
  searchQuery.value = '';
  useRegex.value = false;
  searchInBody.value = false;
  searchInHeaders.value = false;
  selectedMethods.value = [];
  selectedStatuses.value = [];
  minSize.value = null;
  maxSize.value = null;
  minDuration.value = null;
  maxDuration.value = null;
  trafficStore.clearFilter();
}

function confirmClearAll() {
  confirm.require({
    message: 'Clear all captured requests?',
    header: 'Confirm',
    icon: 'pi pi-exclamation-triangle',
    accept: () => trafficStore.clearAll(),
  });
}
</script>

<template>
  <div class="filter-panel">
    <!-- Search -->
    <div class="filter-section">
      <label class="filter-label">Search</label>
      <div class="search-input-wrapper">
        <Search class="search-icon" />
        <input 
          v-model="searchQuery"
          @input="applyFilters"
          type="text"
          class="filter-input"
          :class="{ error: regexError }"
          placeholder="URL, host, path..."
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''; applyFilters()">
          <X class="w-4 h-4" />
        </button>
      </div>
      
      <!-- Search Options -->
      <div class="search-options">
        <label class="checkbox-label">
          <input type="checkbox" v-model="useRegex" @change="applyFilters" />
          <Regex class="w-3 h-3" />
          <span>Regex</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="searchInBody" @change="applyFilters" />
          <span>Body</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="searchInHeaders" @change="applyFilters" />
          <span>Headers</span>
        </label>
      </div>
      
      <div v-if="regexError" class="error-message">
        {{ regexError }}
      </div>
    </div>

    <!-- Methods -->
    <div class="filter-section">
      <label class="filter-label">Methods</label>
      <div class="filter-chips">
        <button 
          v-for="method in HTTP_METHODS" 
          :key="method"
          class="filter-chip"
          :class="{ active: selectedMethods.includes(method) }"
          @click="toggleMethod(method)"
        >
          {{ method }}
        </button>
      </div>
    </div>

    <!-- Status Codes -->
    <div class="filter-section">
      <label class="filter-label">Status</label>
      <div class="filter-chips">
        <button 
          v-for="status in STATUS_OPTIONS" 
          :key="status"
          class="filter-chip"
          :class="{ active: selectedStatuses.includes(status) }"
          @click="toggleStatus(status)"
        >
          {{ status }}
        </button>
      </div>
    </div>

    <!-- Size Filter -->
    <div class="filter-section">
      <label class="filter-label">Size (bytes)</label>
      <div class="range-inputs">
        <input 
          v-model.number="minSize"
          @input="applyFilters"
          type="number"
          class="range-input"
          placeholder="Min"
          min="0"
        />
        <span class="range-separator">-</span>
        <input 
          v-model.number="maxSize"
          @input="applyFilters"
          type="number"
          class="range-input"
          placeholder="Max"
          min="0"
        />
      </div>
    </div>

    <!-- Duration Filter -->
    <div class="filter-section">
      <label class="filter-label">Duration (ms)</label>
      <div class="range-inputs">
        <input 
          v-model.number="minDuration"
          @input="applyFilters"
          type="number"
          class="range-input"
          placeholder="Min"
          min="0"
        />
        <span class="range-separator">-</span>
        <input 
          v-model.number="maxDuration"
          @input="applyFilters"
          type="number"
          class="range-input"
          placeholder="Max"
          min="0"
        />
      </div>
    </div>

    <!-- Hosts -->
    <div v-if="uniqueHosts.length > 0" class="filter-section">
      <label class="filter-label">Top 10 Hosts</label>
      <div class="host-list">
        <div v-for="host in uniqueHosts.slice(0, 10)" :key="host" class="host-item">
          {{ host }}
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="filter-actions">
      <button class="btn btn-secondary" @click="clearFilters">
        Clear Filters
      </button>
      <button class="btn btn-danger" @click="confirmClearAll">
        <Trash2 class="w-4 h-4" />
        Clear All
      </button>
    </div>
  </div>
</template>

<style scoped>
.filter-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
}

.filter-section {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.filter-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.search-input-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
}

.filter-input {
  width: 100%;
  padding: 8px 32px 8px 34px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 13px;
}

.filter-input.error {
  border-color: var(--color-error);
}

.filter-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.filter-input::placeholder {
  color: var(--color-text-muted);
}

.search-options {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.checkbox-label:hover {
  color: var(--color-text-primary);
}

.error-message {
  margin-top: 6px;
  font-size: 11px;
  color: var(--color-error);
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-input {
  flex: 1;
  padding: 6px 10px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 13px;
}

.range-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.range-separator {
  color: var(--color-text-muted);
  font-size: 13px;
}

.clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
}

.clear-btn:hover {
  color: var(--color-text-primary);
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-chip {
  padding: 4px 10px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.filter-chip:hover {
  background: var(--color-bg-elevated);
}

.filter-chip.active {
  background: var(--color-accent-muted);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.host-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.host-item {
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-actions {
  margin-top: auto;
  padding: 16px;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
}

.btn-secondary {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg-elevated);
}

.btn-danger {
  background: rgba(248, 81, 73, 0.15);
  color: var(--color-error);
}

.btn-danger:hover {
  background: rgba(248, 81, 73, 0.25);
}
</style>
