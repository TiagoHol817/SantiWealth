-- Manual run required in Supabase SQL Editor.
-- Lets a savings_plan be optionally connected to an investment_goal.
-- ON DELETE SET NULL: if the goal is hard-deleted, the savings plan
-- survives, just unlinked.

ALTER TABLE public.savings_plans
  ADD COLUMN IF NOT EXISTS linked_goal_id UUID
    REFERENCES public.investment_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_savings_plans_linked_goal
  ON public.savings_plans(linked_goal_id)
  WHERE linked_goal_id IS NOT NULL;
