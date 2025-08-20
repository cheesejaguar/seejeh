// FILE: src/components/MoveAnalysisPanel.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useGameStore } from '../state/gameStore';
import { useTranslation } from '../hooks/useTranslation';
import { analyzeAIMove, explainMove, getLastAIMoveAnalysis } from '../lib/ai';
import { Brain, TrendUp, Shield, Target, ArrowRight, Eye, EyeSlash } from '@phosphor-icons/react';
import { MoveAnalysis, MoveExplanation } from '../lib/types';

export function MoveAnalysisPanel() {
  const { 
    gameState, 
    settings,
    showMoveAnalysis,
    setShowMoveAnalysis,
    lastAIAnalysis 
  } = useGameStore();
  
  const { t } = useTranslation();
  
  if (!showMoveAnalysis) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Brain size={16} />
              <span className="text-sm">{t('analysis.hidden')}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMoveAnalysis(true)}
            >
              <Eye size={16} className="mr-1" />
              {t('analysis.show')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!lastAIAnalysis) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain size={18} />
              {t('analysis.title')}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMoveAnalysis(false)}
            >
              <EyeSlash size={16} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('analysis.waiting')}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const explanation = explainMove(lastAIAnalysis);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain size={18} />
            {t('analysis.title')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <ConfidenceBadge confidence={lastAIAnalysis.confidence} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMoveAnalysis(false)}
            >
              <EyeSlash size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Primary Reasoning */}
        <div>
          <h4 className="text-sm font-medium mb-2">{t('analysis.primaryReason')}</h4>
          <p className="text-sm text-foreground bg-muted/50 p-3 rounded-md">
            {explanation.primary}
          </p>
        </div>
        
        {/* Move Evaluation */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">{t('analysis.evaluation')}</h4>
            <StrengthBadge strength={explanation.evaluation.strength} />
          </div>
          <p className="text-xs text-muted-foreground">
            {explanation.evaluation.reasoning}
          </p>
        </div>
        
        {/* Tactical Factors */}
        <div>
          <h4 className="text-sm font-medium mb-2">{t('analysis.factors')}</h4>
          <div className="grid grid-cols-2 gap-2">
            <FactorIndicator
              icon={<Target size={14} />}
              label={t('analysis.captures')}
              value={lastAIAnalysis.factors.captures}
              type="captures"
            />
            <FactorIndicator
              icon={<ArrowRight size={14} />}
              label={t('analysis.mobility')}
              value={lastAIAnalysis.factors.mobility}
              type="mobility"
            />
            <FactorIndicator
              icon={<Shield size={14} />}
              label={t('analysis.safety')}
              value={lastAIAnalysis.factors.safety}
              type="safety"
            />
            <FactorIndicator
              icon={<TrendUp size={14} />}
              label={t('analysis.position')}
              value={lastAIAnalysis.factors.positioning}
              type="positioning"
            />
          </div>
        </div>
        
        {/* Additional Details */}
        {explanation.details.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">{t('analysis.details')}</h4>
            <ul className="space-y-1">
              {explanation.details.map((detail, index) => (
                <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
  
  if (confidence >= 80) {
    variant = 'default';
  } else if (confidence >= 60) {
    variant = 'secondary';
  } else {
    variant = 'outline';
  }
  
  return (
    <Badge variant={variant} className="text-xs">
      {confidence}%
    </Badge>
  );
}

function StrengthBadge({ strength }: { strength: 'weak' | 'good' | 'strong' | 'excellent' }) {
  const variants = {
    weak: 'outline',
    good: 'secondary',
    strong: 'default',
    excellent: 'default'
  } as const;
  
  const colors = {
    weak: 'text-muted-foreground',
    good: 'text-secondary-foreground',
    strong: 'text-primary-foreground',
    excellent: 'text-primary-foreground'
  };
  
  return (
    <Badge variant={variants[strength]} className={`text-xs ${colors[strength]}`}>
      {strength.charAt(0).toUpperCase() + strength.slice(1)}
    </Badge>
  );
}

function FactorIndicator({ 
  icon, 
  label, 
  value, 
  type 
}: { 
  icon: React.ReactNode;
  label: string;
  value: number;
  type: 'captures' | 'mobility' | 'safety' | 'positioning';
}) {
  const getIntensity = (value: number, type: string) => {
    switch (type) {
      case 'captures':
        return value > 0 ? 'high' : 'none';
      case 'mobility':
        return value > 1 ? 'high' : value > 0 ? 'medium' : value < 0 ? 'low' : 'none';
      case 'safety':
        return value > 0.7 ? 'high' : value > 0.3 ? 'medium' : 'low';
      case 'positioning':
        return value > 0.6 ? 'high' : value > 0.3 ? 'medium' : 'low';
      default:
        return 'none';
    }
  };
  
  const intensity = getIntensity(value, type);
  
  const intensityColors = {
    none: 'text-muted-foreground bg-muted/30',
    low: 'text-destructive bg-destructive/10',
    medium: 'text-primary bg-primary/10',
    high: 'text-accent bg-accent/10'
  };
  
  return (
    <div className={`flex items-center gap-2 p-2 rounded-md text-xs ${intensityColors[intensity]}`}>
      {icon}
      <span className="font-medium">{label}</span>
      {type === 'captures' && value > 0 && (
        <span className="ml-auto font-bold">+{value}</span>
      )}
      {type === 'mobility' && value !== 0 && (
        <span className="ml-auto font-bold">{value > 0 ? '+' : ''}{value}</span>
      )}
    </div>
  );
}