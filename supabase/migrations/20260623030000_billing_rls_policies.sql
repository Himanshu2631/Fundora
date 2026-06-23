-- ============================================================
-- ADD RLS POLICIES FOR SUBSCRIPTIONS AND PAYMENTS
-- ============================================================

-- 1. Policies for subscriptions
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can insert their own subscriptions"
  ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update their own subscriptions"
  ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Policies for payments
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
CREATE POLICY "Users can insert their own payments"
  ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
CREATE POLICY "Users can update their own payments"
  ON public.payments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
