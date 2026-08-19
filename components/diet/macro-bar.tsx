import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const MACRO_STYLES = {
  protein: { label: "Proteína", indicator: "bg-amber-500" },
  carbs: { label: "Carbohidratos", indicator: "bg-sky-500" },
  fat: { label: "Grasa", indicator: "bg-rose-500" },
} as const;

interface MacroBarProps {
  type: keyof typeof MACRO_STYLES;
  grams: number;
  maxGrams: number;
  className?: string;
}

export function MacroBar({ type, grams, maxGrams, className }: MacroBarProps) {
  const { label, indicator } = MACRO_STYLES[type];
  const percent = maxGrams > 0 ? Math.min(100, (grams / maxGrams) * 100) : 0;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{Math.round(grams)} g</span>
      </div>
      <Progress value={percent} indicatorClassName={indicator} />
    </div>
  );
}
