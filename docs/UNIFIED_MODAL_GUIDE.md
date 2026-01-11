# 统一模态框组件库使用指南

本项目提供了一套统一的模态框组件库，确保所有弹窗具有一致的用户体验。

## 组件列表

### 1. BaseModal - 基础模态框
最基础的模态框组件，用于构建自定义模态框。

```tsx
import { BaseModal } from '@/components/ui/unified-modal';

<BaseModal
  isOpen={isOpen}
  onClose={handleClose}
  title="标题"
  description="描述文本"
  size="md" // sm | md | lg | xl | full
  showCloseButton={true}
  closeOnEscape={true}
  closeOnOverlayClick={true}
  isLoading={false}
  footer={<Button onClick={handleClose}>关闭</Button>}
>
  {/* 内容 */}
</BaseModal>
```

### 2. ConfirmModal - 确认对话框
用于需要用户确认的操作。

```tsx
import { ConfirmModal } from '@/components/ui/unified-modal';

<ConfirmModal
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleConfirm}
  title="确认删除"
  message="您确定要删除此项吗？此操作无法撤销。"
  confirmText="删除"
  cancelText="取消"
  variant="destructive" // default | destructive | warning | success
  isLoading={isDeleting}
/>
```

### 3. AlertModal - 提示对话框
用于显示信息、警告或错误消息。

```tsx
import { AlertModal } from '@/components/ui/unified-modal';

<AlertModal
  isOpen={isOpen}
  onClose={handleClose}
  title="操作成功"
  message="您的更改已保存。"
  variant="success" // info | success | warning | error
  buttonText="确定"
/>
```

### 4. FormModal - 表单对话框
用于包含表单的模态框。

```tsx
import { FormModal } from '@/components/ui/unified-modal';

<FormModal
  isOpen={isOpen}
  onClose={handleClose}
  onSubmit={handleSubmit}
  title="创建新项目"
  description="请填写以下信息"
  submitText="创建"
  cancelText="取消"
  isLoading={isSubmitting}
  isValid={formIsValid}
  size="lg"
>
  <Input ... />
  <Select ... />
</FormModal>
```

### 5. LoadingModal - 加载对话框
用于显示加载状态。

```tsx
import { LoadingModal } from '@/components/ui/unified-modal';

<LoadingModal
  isOpen={isLoading}
  message="正在处理..."
/>
```

### 6. FullScreenModal - 全屏模态框
用于需要全屏显示的内容。

```tsx
import { FullScreenModal } from '@/components/ui/unified-modal';

<FullScreenModal
  isOpen={isOpen}
  onClose={handleClose}
  title="全屏视图"
  showCloseButton={true}
>
  {/* 全屏内容 */}
</FullScreenModal>
```

## Hook 使用

### useModalClose
用于为自定义模态框添加统一的关闭行为。

```tsx
import { useModalClose } from '@/hooks/useModalClose';

const MyCustomModal = ({ isOpen, onClose, isLoading }) => {
  const { handleOverlayClick, handleContentClick, canClose } = useModalClose({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnOverlayClick: true,
    preventCloseWhileLoading: true,
    isLoading
  });

  return (
    <div className="overlay" onClick={handleOverlayClick}>
      <div className="content" onClick={handleContentClick}>
        {/* 内容 */}
        <button onClick={onClose} disabled={!canClose}>关闭</button>
      </div>
    </div>
  );
};
```

### useUnifiedModal
完整的模态框管理 Hook，包含在 unified-modal.tsx 中。

```tsx
import { useUnifiedModal } from '@/components/ui/unified-modal';

const { handleClose, handleOverlayClick, handleContentClick, canClose } = useUnifiedModal({
  isOpen,
  onClose,
  closeOnEscape: true,
  closeOnOverlayClick: true,
  preventCloseWhileLoading: true,
  isLoading: false
});
```

## 使用原则

1. **ESC 键关闭**: 所有模态框默认支持 ESC 键关闭
2. **点击遮罩关闭**: 所有模态框默认支持点击遮罩（背景）关闭
3. **关闭按钮**: 所有模态框都应有明显的关闭按钮
4. **加载状态保护**: 加载过程中应禁止关闭，防止数据丢失
5. **一致的动画**: 使用统一的进入/退出动画

## 现有组件统一情况

| 组件 | ESC关闭 | 遮罩关闭 | 关闭按钮 | 状态 |
|------|---------|----------|----------|------|
| UserProfileSettings | ✅ | ✅ | ✅ | 已统一 |
| SubscriptionPlans | ✅ | ✅ | ✅ | 已统一 |
| FriendSystem | ✅ | ✅ | ✅ | 已统一 |
| BadgeCollection | ✅ | ✅ | ✅ | 已统一 |
| GameSettingsDialog | ✅ | ✅ | ✅ | shadcn Dialog |
| AuthModal | ✅ | ✅ | ✅ | shadcn Dialog |
| UsernameChangeDialog | ✅ | ✅ | ✅ | shadcn Dialog |
| ShareDialog | ✅ | ✅ | ✅ | shadcn Dialog |
| RoomPasswordDialog | ✅ | ✅ | ✅ | shadcn Dialog |
| GameOverDialog | ❌ | ❌ | ❌ | 特意禁用 |

注：GameOverDialog 特意禁用外部关闭，强制用户选择操作。

## 迁移指南

如果要将现有自定义模态框迁移到统一组件：

1. 导入 `useModalClose` hook 或使用 `BaseModal` 组件
2. 移除手动的 ESC 键监听
3. 使用 `handleOverlayClick` 替代手动的遮罩点击处理
4. 确保有明显的关闭按钮
