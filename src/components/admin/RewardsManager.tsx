import { useState, useEffect } from 'react';
import { useRewardSettings, useUpdateRewardSettings } from '@/hooks/useRewardSettings';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, DollarSign, Gift, Shield, Save, Award } from 'lucide-react';

const RewardsManager = () => {
  const { data: settings, isLoading } = useRewardSettings();
  const updateSettings = useUpdateRewardSettings();

  const [isEnabled, setIsEnabled] = useState(true);
  const [dollarsPerPoint, setDollarsPerPoint] = useState(2);
  const [pointsPerDollar, setPointsPerDollar] = useState(10);
  const [minPoints, setMinPoints] = useState(200);
  const [maxPoints, setMaxPoints] = useState(350);

  useEffect(() => {
    if (settings) {
      setIsEnabled(settings.is_enabled);
      setDollarsPerPoint(settings.dollars_per_point);
      setPointsPerDollar(settings.points_per_dollar);
      setMinPoints(settings.min_points_to_redeem);
      setMaxPoints(settings.max_points_per_order);
    }
  }, [settings]);

  const handleSave = () => {
    if (!settings) return;
    updateSettings.mutate({
      id: settings.id,
      is_enabled: isEnabled,
      dollars_per_point: dollarsPerPoint,
      points_per_dollar: pointsPerDollar,
      min_points_to_redeem: minPoints,
      max_points_per_order: maxPoints,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const maxDiscount = (maxPoints / pointsPerDollar).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6" /> Rewards Settings
          </h2>
          <p className="text-muted-foreground">Configure your customer loyalty program</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rewards Program Toggle */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5" /> Rewards Program
          </h3>
          <p className="text-sm text-muted-foreground mb-4">Enable or disable the loyalty program</p>
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Rewards Enabled</span>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>
        </div>

        {/* Points Earning Rate */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5" /> Points Earning Rate
          </h3>
          <p className="text-sm text-muted-foreground mb-4">How many dollars spent = 1 reward point</p>
          <label className="text-sm font-medium text-foreground">Dollars per Point</label>
          <Select value={String(dollarsPerPoint)} onValueChange={(v) => setDollarsPerPoint(Number(v))}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  ${n} spent = 1 point
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-2">
            Currently: Customer earns <strong>1 point</strong> for every <strong>${dollarsPerPoint}</strong> spent
          </p>
        </div>

        {/* Points Redemption Value */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2 mb-1">
            <Gift className="w-5 h-5" /> Points Redemption Value
          </h3>
          <p className="text-sm text-muted-foreground mb-4">How many points needed for $1 discount</p>
          <label className="text-sm font-medium text-foreground">Points per Dollar</label>
          <Select value={String(pointsPerDollar)} onValueChange={(v) => setPointsPerDollar(Number(v))}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 15, 20, 25, 50, 75, 100, 150, 200].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} points = $1 off
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-2">
            Currently: <strong>{pointsPerDollar} points</strong> = <strong>$1</strong> discount
          </p>
        </div>

        {/* Minimum Points to Redeem */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2 mb-1">
            <Award className="w-5 h-5" /> Minimum Points to Redeem
          </h3>
          <p className="text-sm text-muted-foreground mb-4">Minimum points required before customer can use rewards</p>
          <label className="text-sm font-medium text-foreground">Minimum Points</label>
          <Input
            type="number"
            value={minPoints}
            onChange={(e) => setMinPoints(Number(e.target.value))}
            min={0}
            className="mt-1"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Customer must have at least <strong>{minPoints} points</strong> to redeem
          </p>
        </div>
      </div>

      {/* Maximum Points per Order */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2 mb-1">
          <Gift className="w-5 h-5" /> Maximum Points per Order
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Limit how many points can be redeemed in a single order</p>
        <label className="text-sm font-medium text-foreground">Max Points per Order</label>
        <Input
          type="number"
          value={maxPoints}
          onChange={(e) => setMaxPoints(Number(e.target.value))}
          min={0}
          className="mt-1 max-w-sm"
        />
        <p className="text-sm text-muted-foreground mt-2">
          Maximum <strong>{maxPoints} points</strong> can be used per order (= <strong>${maxDiscount}</strong> max discount)
        </p>
      </div>

      {/* Rewards Summary */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2 mb-4">
          🎁 Rewards Summary
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center mb-6">
          <div>
            <div className="text-3xl font-bold text-foreground">${dollarsPerPoint}</div>
            <div className="text-sm text-muted-foreground">spent = 1 point</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">{pointsPerDollar}</div>
            <div className="text-sm text-muted-foreground">points = $1 discount</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground">{minPoints}</div>
            <div className="text-sm text-muted-foreground">min points to redeem</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          <strong>Example:</strong> If a customer spends <strong>$100</strong>, they earn{' '}
          <strong>{Math.floor(100 / dollarsPerPoint)} points</strong>. To get a{' '}
          <strong>${(minPoints / pointsPerDollar).toFixed(0)} discount</strong>, they need{' '}
          <strong>{minPoints} points</strong>.
        </p>
      </div>
    </div>
  );
};

export default RewardsManager;
