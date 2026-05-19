-- budget_items has no user_id column — protect via join to parent budgets table
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own budget items" ON public.budget_items;
CREATE POLICY "Users access own budget items"
  ON public.budget_items
  FOR ALL
  TO authenticated
  USING (
    budget_id IN (
      SELECT id FROM public.budgets WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    budget_id IN (
      SELECT id FROM public.budgets WHERE user_id = auth.uid()
    )
  );
