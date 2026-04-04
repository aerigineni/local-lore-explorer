CREATE TABLE public.agent_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  location_name TEXT NOT NULL,
  response_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view agent responses"
ON public.agent_responses FOR SELECT
USING (true);

CREATE POLICY "Anyone can create agent responses"
ON public.agent_responses FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update agent responses"
ON public.agent_responses FOR UPDATE
USING (true);

CREATE INDEX idx_agent_responses_request_id ON public.agent_responses (request_id);
CREATE INDEX idx_agent_responses_status ON public.agent_responses (status);