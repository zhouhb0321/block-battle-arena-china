
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Share2, Copy, MessageCircle, QrCode } from 'lucide-react';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gameScore?: number;
  roomId?: string;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ isOpen, onClose, gameScore, roomId }) => {
  const baseUrl = window.location.origin;
  const shareUrl = roomId ? `${baseUrl}/room/${roomId}` : window.location.href;
  const shareText = gameScore 
    ? `我在方块竞技场获得了 ${gameScore} 分！一起来挑战吧！`
    : `一起来方块竞技场对战俄罗斯方块吧！`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  const shareToWeChat = () => {
    // 微信分享 (实际需要接入微信SDK)
    const weChatUrl = `weixin://dl/business/?t=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    window.open(weChatUrl, '_blank');
  };

  const shareToQQ = () => {
    // QQ分享
    const qqUrl = `mqqwpa://im/chat?chat_type=wpa&uin=&version=1&src_type=web&web_src=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
    window.open(qqUrl, '_blank');
  };

  const shareToWeibo = () => {
    // 微博分享
    const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
    window.open(weiboUrl, '_blank');
  };

  const shareToDingTalk = () => {
    // 钉钉分享
    const dingUrl = `dingtalk://dingtalkclient/page/link?url=${encodeURIComponent(shareUrl)}&pc_slide=true`;
    window.open(dingUrl, '_blank');
  };

  const shareToFeishu = () => {
    // 飞书分享
    copyToClipboard(`${shareText} ${shareUrl}`);
    toast.info('请在飞书中粘贴分享');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            分享游戏
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>分享链接</Label>
            <div className="flex gap-2 mt-1">
              <Input value={shareUrl} readOnly />
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(shareUrl)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>分享文本</Label>
            <div className="flex gap-2 mt-1">
              <Input value={shareText} readOnly />
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(shareText)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={shareToWeChat} className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              微信
            </Button>
            <Button variant="outline" onClick={shareToQQ} className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              QQ
            </Button>
            <Button variant="outline" onClick={shareToWeibo} className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              微博
            </Button>
            <Button variant="outline" onClick={shareToDingTalk} className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              钉钉
            </Button>
            <Button variant="outline" onClick={shareToFeishu} className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              飞书
            </Button>
            <Button variant="outline" onClick={() => copyToClipboard(`${shareText} ${shareUrl}`)} className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              复制全部
            </Button>
          </div>

          {roomId && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                房间ID: <span className="font-mono font-bold">{roomId}</span>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                好友可以直接输入房间ID加入游戏
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
