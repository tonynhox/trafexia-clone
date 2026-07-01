<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { X, Plus, Trash2, Edit, Power, PowerOff } from 'lucide-vue-next';
import { useToast } from 'primevue/usetoast';
import type { MockRule } from '../../shared/types';

const toast = useToast();
const emit = defineEmits<{
  close: [];
}>();

const rules = ref<MockRule[]>([]);
const showEditor = ref(false);
const editingRule = ref<MockRule | null>(null);

// Editor form
const formName = ref('');
const formUrlPattern = ref('');
const formMethod = ref('');
const formStatus = ref(200);
const formHeaders = ref('Content-Type: application/json');
const formBody = ref('{"message": "Mocked response"}');
const formDelay = ref(0);
const formEnabled = ref(true);

const HTTP_METHODS = ['', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

onMounted(async () => {
  await loadRules();
});

async function loadRules() {
  try {
    rules.value = await window.electronAPI.getMockRules();
  } catch (error) {
    console.error('Failed to load mock rules:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Could not load mock rules',
      life: 3000
    });
  }
}

function openEditor(rule?: MockRule) {
  if (rule) {
    editingRule.value = rule;
    formName.value = rule.name;
    formUrlPattern.value = rule.urlPattern;
    formMethod.value = rule.method || '';
    formStatus.value = rule.responseStatus;
    formHeaders.value = Object.entries(rule.responseHeaders)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    formBody.value = rule.responseBody;
    formDelay.value = rule.delay || 0;
    formEnabled.value = rule.enabled;
  } else {
    editingRule.value = null;
    formName.value = 'New Mock Rule';
    formUrlPattern.value = '.*api\\.example\\.com.*';
    formMethod.value = '';
    formStatus.value = 200;
    formHeaders.value = 'Content-Type: application/json';
    formBody.value = '{"message": "Mocked response"}';
    formDelay.value = 0;
    formEnabled.value = true;
  }
  showEditor.value = true;
}

function closeEditor() {
  showEditor.value = false;
  editingRule.value = null;
}

function parseHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const name = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      if (name) headers[name] = value;
    }
  }
  
  return headers;
}

async function saveRule() {
  try {
    const ruleData = {
      name: formName.value.trim(),
      enabled: formEnabled.value,
      urlPattern: formUrlPattern.value.trim(),
      method: formMethod.value || undefined,
      responseStatus: formStatus.value,
      responseHeaders: parseHeaders(formHeaders.value),
      responseBody: formBody.value,
      delay: formDelay.value > 0 ? formDelay.value : undefined,
    };

    if (!ruleData.name || !ruleData.urlPattern) {
      toast.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Name and URL pattern are required',
        life: 3000
      });
      return;
    }

    if (editingRule.value) {
      await window.electronAPI.updateMockRule(editingRule.value.id, ruleData);
      toast.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Mock rule updated',
        life: 2000
      });
    } else {
      await window.electronAPI.addMockRule(ruleData);
      toast.add({
        severity: 'success',
        summary: 'Created',
        detail: 'Mock rule created',
        life: 2000
      });
    }

    await loadRules();
    closeEditor();
  } catch (error) {
    console.error('Failed to save rule:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Could not save mock rule',
      life: 3000
    });
  }
}

async function deleteRule(id: string) {
  if (!confirm('Delete this mock rule?')) return;
  
  try {
    await window.electronAPI.deleteMockRule(id);
    await loadRules();
    toast.add({
      severity: 'success',
      summary: 'Deleted',
      detail: 'Mock rule deleted',
      life: 2000
    });
  } catch (error) {
    console.error('Failed to delete rule:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Could not delete mock rule',
      life: 3000
    });
  }
}

async function toggleRule(rule: MockRule) {
  try {
    await window.electronAPI.toggleMockRule(rule.id, !rule.enabled);
    await loadRules();
  } catch (error) {
    console.error('Failed to toggle rule:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Could not toggle mock rule',
      life: 3000
    });
  }
}
</script>

<template>
  <div class="mock-overlay" @click.self="emit('close')">
    <div class="mock-dialog">
      <!-- Header -->
      <div class="mock-header">
        <h2>Mock Rules</h2>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary" @click="openEditor()">
            <Plus style="width: 16px; height: 16px; margin-right: 6px;" />
            Add Rule
          </button>
          <button class="btn btn-ghost btn-icon" @click="emit('close')" title="Close">
            <X style="width: 18px; height: 18px;" />
          </button>
        </div>
      </div>

      <!-- Rules List -->
      <div class="mock-content">
        <div v-if="rules.length === 0" class="empty-state">
          <p>No mock rules configured</p>
          <p style="font-size: 13px; color: #8b949e;">Create rules to intercept and mock responses</p>
        </div>

        <div v-for="rule in rules" :key="rule.id" class="rule-card" :class="{ disabled: !rule.enabled }">
          <div class="rule-header">
            <div class="rule-info">
              <h3>{{ rule.name }}</h3>
              <div class="rule-meta">
                <span class="badge">{{ rule.method || 'ALL' }}</span>
                <span class="badge status">{{ rule.responseStatus }}</span>
                <span v-if="rule.delay" class="badge">{{ rule.delay }}ms delay</span>
              </div>
            </div>
            <div class="rule-actions">
              <button 
                class="btn btn-icon" 
                @click="toggleRule(rule)" 
                :title="rule.enabled ? 'Disable' : 'Enable'"
              >
                <Power v-if="rule.enabled" style="width: 16px; height: 16px; color: #3fb950;" />
                <PowerOff v-else style="width: 16px; height: 16px; color: #8b949e;" />
              </button>
              <button class="btn btn-icon" @click="openEditor(rule)" title="Edit">
                <Edit style="width: 16px; height: 16px;" />
              </button>
              <button class="btn btn-icon" @click="deleteRule(rule.id)" title="Delete">
                <Trash2 style="width: 16px; height: 16px; color: #f85149;" />
              </button>
            </div>
          </div>
          <div class="rule-pattern">{{ rule.urlPattern }}</div>
        </div>
      </div>

      <!-- Editor Dialog -->
      <div v-if="showEditor" class="editor-overlay" @click.self="closeEditor">
        <div class="editor-dialog">
          <div class="editor-header">
            <h3>{{ editingRule ? 'Edit' : 'New' }} Mock Rule</h3>
            <button class="btn btn-ghost btn-icon" @click="closeEditor">
              <X style="width: 16px; height: 16px;" />
            </button>
          </div>

          <div class="editor-content">
            <div class="form-group">
              <label>Rule Name</label>
              <input v-model="formName" type="text" class="input" placeholder="e.g., Mock API Response" />
            </div>

            <div class="form-row">
              <div class="form-group" style="flex: 1;">
                <label>URL Pattern (Regex)</label>
                <input v-model="formUrlPattern" type="text" class="input" placeholder=".*api\\.example\\.com.*" />
              </div>
              <div class="form-group" style="width: 120px;">
                <label>Method</label>
                <select v-model="formMethod" class="select">
                  <option v-for="m in HTTP_METHODS" :key="m" :value="m">{{ m || 'ALL' }}</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" style="width: 120px;">
                <label>Status Code</label>
                <input v-model.number="formStatus" type="number" class="input" />
              </div>
              <div class="form-group" style="width: 120px;">
                <label>Delay (ms)</label>
                <input v-model.number="formDelay" type="number" class="input" min="0" />
              </div>
              <div class="form-group" style="width: 120px; justify-content: flex-end;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input v-model="formEnabled" type="checkbox" />
                  <span>Enabled</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>Response Headers</label>
              <textarea v-model="formHeaders" class="textarea" rows="3"></textarea>
            </div>

            <div class="form-group">
              <label>Response Body</label>
              <textarea v-model="formBody" class="textarea" rows="8"></textarea>
            </div>
          </div>

          <div class="editor-footer">
            <button class="btn btn-ghost" @click="closeEditor">Cancel</button>
            <button class="btn btn-primary" @click="saveRule">Save Rule</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mock-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.mock-dialog {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.mock-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #30363d;
}

.mock-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #e6edf3;
}

.mock-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #8b949e;
}

.rule-card {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
}

.rule-card.disabled {
  opacity: 0.5;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.rule-info h3 {
  margin: 0 0 8px 0;
  font-size: 15px;
  font-weight: 600;
  color: #e6edf3;
}

.rule-meta {
  display: flex;
  gap: 6px;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #8b949e;
}

.badge.status {
  color: #3fb950;
}

.rule-actions {
  display: flex;
  gap: 4px;
}

.rule-pattern {
  font-family: monospace;
  font-size: 13px;
  color: #58a6ff;
  margin-top: 8px;
}

.editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.editor-dialog {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #30363d;
}

.editor-header h3 {
  margin: 0;
  font-size: 16px;
  color: #e6edf3;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #8b949e;
}

.input, .select, .textarea {
  width: 100%;
  padding: 8px 12px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #e6edf3;
  font-size: 13px;
}

.input:focus, .select:focus, .textarea:focus {
  outline: none;
  border-color: #58a6ff;
}

.textarea {
  font-family: 'Consolas', monospace;
  resize: vertical;
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #30363d;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
}

.btn-primary {
  background: #238636;
  color: white;
}

.btn-primary:hover {
  background: #2ea043;
}

.btn-ghost {
  background: transparent;
  color: #e6edf3;
  border: 1px solid #30363d;
}

.btn-ghost:hover {
  background: #21262d;
}

.btn-icon {
  padding: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  border-radius: 4px;
}

.btn-icon:hover {
  background: #21262d;
  color: #e6edf3;
}
</style>
