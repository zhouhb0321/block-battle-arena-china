import React, { useState } from 'react';
import { MessageSquarePlus, Bug, Lightbulb, HelpCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const APP_VERSION = '1.0.0';

const feedbackLabels: Record<string, Record<string, { title: string; bug: string; suggestion: string; other: string; placeholder: string; submit: string; success: string; error: string; anonymous: string }>> = {
  en: { default: { title: 'Send Feedback', bug: 'Bug Report', suggestion: 'Suggestion', other: 'Other', placeholder: 'Describe your feedback...', submit: 'Submit', success: 'Thank you for your feedback!', error: 'Failed to submit feedback', anonymous: 'Anonymous feedback' } },
  zh: { default: { title: '发送反馈', bug: '报告Bug', suggestion: '建议', other: '其他', placeholder: '请描述你的反馈...', submit: '提交', success: '感谢您的反馈！', error: '提交反馈失败', anonymous: '匿名反馈' } },
  ja: { default: { title: 'フィードバック', bug: 'バグ報告', suggestion: '提案', other: 'その他', placeholder: 'フィードバックを記入してください...', submit: '送信', success: 'フィードバックありがとうございます！', error: 'フィードバックの送信に失敗しました', anonymous: '匿名フィードバック' } },
};

const FeedbackButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'suggestion' | 'other'>('suggestion');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { language } = useLanguage();

  const lang = feedbackLabels[language]?.default || feedbackLabels.en.default;

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('user_feedback' as any).insert({
        user_id: user?.id || null,
        username: (user as any)?.username || null,
        feedback_type: feedbackType,
        content: content.trim(),
        page: window.location.pathname,
        app_version: APP_VERSION,
        user_agent: navigator.userAgent,
      } as any);

      if (error) throw error;
      toast.success(lang.success);
      setContent('');
      setIsOpen(false);
    } catch (e) {
      console.error('Feedback submit error:', e);
      toast.error(lang.error);
    } finally {
      setSubmitting(false);
    }
  };

  const typeOptions = [
    { value: 'bug' as const, label: lang.bug, icon: Bug, color: 'text-red-500' },
    { value: 'suggestion' as const, label: lang.suggestion, icon: Lightbulb, color: 'text-yellow-500' },
    { value: 'other' as const, label: lang.other, icon: HelpCircle, color: 'text-blue-500' },
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105"
        aria-label="Feedback"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquarePlus className="w-5 h-5" />}
      </button>

      {/* Feedback panel */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-80 bg-card border border-border rounded-lg shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{lang.title}</h3>
            <span className="text-xs text-muted-foreground">v{APP_VERSION}</span>
          </div>

          {/* Type selector */}
          <div className="flex gap-2">
            {typeOptions.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => setFeedbackType(value)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs border transition-colors ${
                  feedbackType === value
                    ? 'border-primary bg-primary/10 font-medium'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={lang.placeholder}
            className="resize-none text-sm h-24"
            maxLength={2000}
          />

          <div className="flex items-center justify-between">
            {!user && (
              <span className="text-xs text-muted-foreground">{lang.anonymous}</span>
            )}
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="ml-auto gap-1"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {lang.submit}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;
