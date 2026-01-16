import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { uploadAdImage } from '@/utils/adImageUpload';
import { checkAdminPermission, logAdManagementAction } from '@/utils/adPermissions';
import AdAnalyticsDashboard from './AdAnalyticsDashboard';
import { Plus, Edit, Trash2, Eye, EyeOff, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Advertisement {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  target_url?: string;
  position: string;
  region?: string;
  language?: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  impressions: number;
  clicks: number;
  budget?: number;
  spent?: number;
  priority?: number;
  frequency_cap?: number;
  ab_test_group?: string;
}

const AdvertisingManagementPro: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_url: '',
    position: 'right',
    region: '',
    language: '',
    is_active: true,
    start_date: '',
    end_date: '',
    budget: '',
    priority: '0',
    frequency_cap: '',
    ab_test_group: ''
  });

  useEffect(() => {
    if (user) {
      checkAdminPermission(user.id).then(setIsAdmin);
      fetchAds();
    }
  }, [user]);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
      toast.error(t('admin.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error(t('admin.noPermission'));
      return;
    }

    try {
      let imageUrl = selectedAd?.image_url || '';
      
      if (imageFile) {
        imageUrl = await uploadAdImage(imageFile);
      }

      const adData = {
        ...formData,
        image_url: imageUrl,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        priority: parseInt(formData.priority),
        frequency_cap: formData.frequency_cap ? parseInt(formData.frequency_cap) : null
      };

      if (selectedAd) {
        const { error } = await supabase
          .from('advertisements')
          .update(adData)
          .eq('id', selectedAd.id);

        if (error) throw error;
        
        await logAdManagementAction(user!.id, 'update', selectedAd.id, adData);
        toast.success(t('admin.updateSuccess'));
      } else {
        const { error } = await supabase
          .from('advertisements')
          .insert([adData]);

        if (error) throw error;
        
        await logAdManagementAction(user!.id, 'create', '', adData);
        toast.success(t('admin.createSuccess'));
      }

      setIsDialogOpen(false);
      resetForm();
      fetchAds();
    } catch (error) {
      console.error('Error saving ad:', error);
      toast.error(t('admin.saveFailed'));
    }
  };

  const handleToggleActive = async (ad: Advertisement) => {
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({ is_active: !ad.is_active })
        .eq('id', ad.id);

      if (error) throw error;
      
      await logAdManagementAction(user!.id, 'toggle', ad.id, { is_active: !ad.is_active });
      toast.success(!ad.is_active ? t('admin.enableSuccess') : t('admin.disableSuccess'));
      fetchAds();
    } catch (error) {
      console.error('Error toggling ad:', error);
      toast.error(t('common.failed'));
    }
  };

  const handleDelete = async (adId: string) => {
    if (!confirm(t('admin.deleteConfirm'))) return;

    try {
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', adId);

      if (error) throw error;
      
      await logAdManagementAction(user!.id, 'delete', adId, {});
      toast.success(t('admin.deleteSuccess'));
      fetchAds();
    } catch (error) {
      console.error('Error deleting ad:', error);
      toast.error(t('admin.deleteFailed'));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      target_url: '',
      position: 'right',
      region: '',
      language: '',
      is_active: true,
      start_date: '',
      end_date: '',
      budget: '',
      priority: '0',
      frequency_cap: '',
      ab_test_group: ''
    });
    setImageFile(null);
    setImagePreview('');
    setSelectedAd(null);
  };

  const openEditDialog = (ad: Advertisement) => {
    setSelectedAd(ad);
    setFormData({
      title: ad.title,
      content: ad.content,
      target_url: ad.target_url || '',
      position: ad.position,
      region: ad.region || '',
      language: ad.language || '',
      is_active: ad.is_active,
      start_date: ad.start_date || '',
      end_date: ad.end_date || '',
      budget: ad.budget?.toString() || '',
      priority: ad.priority?.toString() || '0',
      frequency_cap: ad.frequency_cap?.toString() || '',
      ab_test_group: ad.ab_test_group || ''
    });
    setImagePreview(ad.image_url || '');
    setIsDialogOpen(true);
  };

  const calculateCTR = (ad: Advertisement) => {
    if (ad.impressions === 0) return '0.00';
    return ((ad.clicks / ad.impressions) * 100).toFixed(2);
  };

  if (!isAdmin) {
    return <div className="p-8 text-center">{t('admin.noAccess')}</div>;
  }

  if (loading) {
    return <div className="p-8 text-center">{t('admin.loading')}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('admin.adManagement')}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              {t('admin.createAd')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedAd ? t('admin.editAd') : t('admin.createAd')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t('admin.adTitle')}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">{t('admin.adContent')}</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">{t('admin.adImage')}</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded mt-2" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">{t('admin.adPosition')}</Label>
                  <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">{t('admin.position.left')}</SelectItem>
                      <SelectItem value="right">{t('admin.position.right')}</SelectItem>
                      <SelectItem value="top">{t('admin.position.top')}</SelectItem>
                      <SelectItem value="bottom">{t('admin.position.bottom')}</SelectItem>
                      <SelectItem value="popup">{t('admin.position.popup')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">{t('admin.priority')}</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">{t('admin.targetRegion')}</Label>
                  <Input
                    id="region"
                    placeholder="CN, US, JP"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">{t('admin.targetLanguage')}</Label>
                  <Input
                    id="language"
                    placeholder="zh, en, ja"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">{t('admin.startDate')}</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">{t('admin.endDate')}</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">{t('admin.budget')}</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency_cap">{t('admin.frequencyCap')}</Label>
                  <Input
                    id="frequency_cap"
                    type="number"
                    value={formData.frequency_cap}
                    onChange={(e) => setFormData({ ...formData, frequency_cap: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_url">{t('admin.targetUrl')}</Label>
                <Input
                  id="target_url"
                  type="url"
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ab_test_group">{t('admin.abTestGroup')}</Label>
                <Input
                  id="ab_test_group"
                  placeholder="A, B, C"
                  value={formData.ab_test_group}
                  onChange={(e) => setFormData({ ...formData, ab_test_group: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">{t('admin.enableNow')}</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('admin.cancel')}
                </Button>
                <Button type="submit">
                  {selectedAd ? t('admin.update') : t('admin.create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">{t('admin.adList')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('admin.analytics')}</TabsTrigger>
          <TabsTrigger value="logs">{t('admin.operationLogs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.allAds')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.adTitle')}</TableHead>
                    <TableHead>{t('admin.adPosition')}</TableHead>
                    <TableHead>{t('admin.status')}</TableHead>
                    <TableHead>{t('admin.impressionsClicks')}</TableHead>
                    <TableHead>CTR</TableHead>
                    <TableHead>{t('admin.budgetSpent')}</TableHead>
                    <TableHead>{t('admin.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell className="font-medium">{ad.title}</TableCell>
                      <TableCell>{ad.position}</TableCell>
                      <TableCell>
                        {ad.is_active ? (
                          <Badge variant="default">{t('admin.active')}</Badge>
                        ) : (
                          <Badge variant="secondary">{t('admin.disabled')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{ad.impressions} / {ad.clicks}</TableCell>
                      <TableCell>{calculateCTR(ad)}%</TableCell>
                      <TableCell>
                        {ad.budget ? `¥${ad.budget} / ¥${ad.spent || 0}` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(ad)}
                          >
                            {ad.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(ad)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(ad.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          {ads.length > 0 ? (
            <AdAnalyticsDashboard adId={ads[0].id} />
          ) : (
            <div className="text-center p-8">{t('admin.noAdData')}</div>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.operationLogs')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('admin.logsInDevelopment')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvertisingManagementPro;
