import { Check } from "lucide-react";
import { cn } from "@apifold/ui";

interface Step {
  readonly label: string;
}

interface StepIndicatorProps {
  readonly steps: readonly Step[];
  readonly currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="flex items-center justify-center">
      <ol className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <li key={step.label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors duration-200",
                  isCompleted &&
                    "border-foreground bg-foreground text-background",
                  isCurrent &&
                    "border-foreground text-foreground",
                  !isCompleted &&
                    !isCurrent &&
                    "border-muted-foreground/20 text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="tabular-nums">{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline transition-colors duration-200",
                  isCurrent
                    ? "text-foreground font-heading"
                    : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-10 rounded-full transition-colors duration-200",
                    isCompleted
                      ? "bg-foreground"
                      : "bg-muted",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
