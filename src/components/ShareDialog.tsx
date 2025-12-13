/**
 * 房间分享对话框
 * 支持复制完整链接、Web Share API
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Copy, Share2, Check, Link, MessageCircle, QrCode } from 'lucide-react';
import { toast } from 'sonner';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string;  // 房间号（用于生成分享链接）
  roomId?: string;    // 向后兼容
  gameScore?: number;
  roomMode?: string;
}

const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  roomCode,
  roomId,
  gameScore,
  roomMode = '对战'
}) => {
  const [copied, setCopied] = useState(false);
  
  const code = roomCode || roomId;
  
  // 生成完整分享链接
  const baseUrl = window.location.origin;
  const shareUrl = code ? `${baseUrl}/?room=${code}` : window.location.href;
  
  // 分享文案
  const shareTitle = `加入我的方块对战房间`;
  const shareText = gameScore 
    ? `我在方块竞技场获得了 ${gameScore} 分！一起来挑战吧！`
    : code 
      ? `快来和我一起玩方块${roomMode}！房间号: ${code}\n点击链接直接加入: ${shareUrl}`
      : `一起来方块竞技场对战俄罗斯方块吧！`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('复制失败，请手动复制');
    }
  };
  
  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success('房间号已复制');
    } catch (err) {
      toast.error('复制失败');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        toast.success('分享成功');
      } catch (err) {
        // 用户取消分享不显示错误
        if ((err as Error).name !== 'AbortError') {
          toast.error('分享失败');
        }
      }
    } else {
      // 不支持 Web Share API，复制链接
      handleCopyLink();
    }
  };

  const shareToWeChat = () => {
    const weChatUrl = `weixin://dl/business/?t=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    window.open(weChatUrl, '_blank');
  };

  const shareToQQ = () => {
    const qqUrl = `mqqwpa://im/chat?chat_type=wpa&uin=&version=1&src_type=web&web_src=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
    window.open(qqUrl, '_blank');
  };

  const shareToWeibo = () => {
    const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
    window.open(weiboUrl, '_blank');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            分享{code ? '房间' : '游戏'}
          </DialogTitle>
          {code && (
            <DialogDescription>
              邀请好友加入你的{roomMode}房间
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 房间号显示 */}
          {code && (
            <div className="flex items-center gap-2">
              <div className="flex-1 text-center py-4 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">房间号</div>
                <div className="text-3xl font-mono font-bold tracking-widest text-primary">
                  {code}
                </div>
              </div>
              <Button size="icon" variant="outline" onClick={handleCopyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* 分享链接 */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">分享链接</Label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button 
                variant={copied ? "default" : "outline"} 
                size="icon"
                onClick={handleCopyLink}
                className={copied ? "bg-green-500 hover:bg-green-500" : ""}
              >
                {copied ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* 分享按钮 */}
          <div className="flex gap-2">
            <Button 
              className="flex-1" 
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              {navigator.share ? '分享给好友' : '复制分享链接'}
            </Button>
          </div>

          {/* 社交分享按钮 */}
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={shareToWeChat} className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              微信
            </Button>
            <Button variant="outline" size="sm" onClick={shareToQQ} className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              QQ
            </Button>
            <Button variant="outline" size="sm" onClick={shareToWeibo} className="flex items-center gap-1">
              <Share2 className="w-4 h-4" />
              微博
            </Button>
          </div>
          
          {/* 提示 */}
          {code && (
            <p className="text-xs text-muted-foreground text-center">
              好友点击链接即可直接加入房间，无需手动输入房间号
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
