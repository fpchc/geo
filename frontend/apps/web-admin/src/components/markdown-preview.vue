<script lang="ts" setup>
import { computed } from 'vue';

import MarkdownIt from 'markdown-it';

defineOptions({ name: 'MarkdownPreview' });

const props = withDefaults(defineProps<{ content?: string }>(), {
  content: '',
});

// html: false 关闭原始 HTML，避免 XSS；linkify 自动识别链接
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

const rendered = computed(() => md.render(props.content ?? ''));
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown-preview" v-html="rendered"></div>
</template>

<style scoped>
.markdown-preview {
  line-height: 1.7;
  color: hsl(var(--foreground));
  word-break: break-all;
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4) {
  margin: 1.2em 0 0.6em;
  font-weight: 600;
  line-height: 1.3;
}

.markdown-preview :deep(h1) {
  font-size: 1.6em;
}

.markdown-preview :deep(h2) {
  font-size: 1.35em;
}

.markdown-preview :deep(h3) {
  font-size: 1.15em;
}

.markdown-preview :deep(p) {
  margin: 0.6em 0;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  padding-left: 1.5em;
  margin: 0.6em 0;
  list-style: revert;
}

.markdown-preview :deep(blockquote) {
  padding-left: 1em;
  margin: 0.8em 0;
  color: hsl(var(--muted-foreground));
  border-left: 3px solid hsl(var(--border));
}

.markdown-preview :deep(code) {
  padding: 0.15em 0.4em;
  font-size: 0.9em;
  background-color: hsl(var(--muted));
  border-radius: 4px;
}

.markdown-preview :deep(pre) {
  padding: 1em;
  margin: 0.8em 0;
  overflow-x: auto;
  background-color: hsl(var(--muted));
  border-radius: 6px;
}

.markdown-preview :deep(pre code) {
  padding: 0;
  background-color: transparent;
}

.markdown-preview :deep(a) {
  color: hsl(var(--primary));
  text-decoration: underline;
}

.markdown-preview :deep(table) {
  width: 100%;
  margin: 0.8em 0;
  border-collapse: collapse;
}

.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  padding: 0.5em 0.8em;
  border: 1px solid hsl(var(--border));
}
</style>
