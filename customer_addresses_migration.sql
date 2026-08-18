-- 1. Create table customer_addresses
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT NOT NULL, -- e.g., 'Rumah', 'Kantor', dll
    full_address TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Migrate existing addresses from customers table
-- We extract the label from the format [Label]\n... if possible, else default to 'Utama'
INSERT INTO public.customer_addresses (auth_id, label, full_address, is_default)
SELECT 
    auth_id, 
    CASE 
        WHEN address LIKE '[%]%' THEN substring(address from '\[(.*?)\]')
        ELSE 'Utama' 
    END as label,
    address as full_address,
    true as is_default
FROM public.customers
WHERE address IS NOT NULL AND trim(address) != '';

-- 3. Enable RLS
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own addresses" 
    ON public.customer_addresses FOR SELECT 
    USING (auth.uid() = auth_id);

CREATE POLICY "Users can insert their own addresses" 
    ON public.customer_addresses FOR INSERT 
    WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "Users can update their own addresses" 
    ON public.customer_addresses FOR UPDATE 
    USING (auth.uid() = auth_id);

CREATE POLICY "Users can delete their own addresses" 
    ON public.customer_addresses FOR DELETE 
    USING (auth.uid() = auth_id);

-- 4. Create trigger to sync default address back to customers table
-- This ensures backward compatibility for aplikasi_internal
CREATE OR REPLACE FUNCTION public.sync_default_address_to_customers()
RETURNS TRIGGER AS $$
BEGIN
    -- If a new address is set as default (inserted or updated to true)
    IF (TG_OP = 'INSERT' AND NEW.is_default = true) OR 
       (TG_OP = 'UPDATE' AND NEW.is_default = true AND OLD.is_default = false) THEN
        
        -- Update the customers table
        UPDATE public.customers 
        SET address = NEW.full_address
        WHERE auth_id = NEW.auth_id;
        
        -- Make sure other addresses for this user are not default
        UPDATE public.customer_addresses
        SET is_default = false
        WHERE auth_id = NEW.auth_id AND id != NEW.id;
    END IF;
    
    -- If a default address is deleted, we don't necessarily clear the customers.address 
    -- to prevent data loss in internal app, but we could. For now, leave it.
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_customer_address_default_set ON public.customer_addresses;
CREATE TRIGGER on_customer_address_default_set
    AFTER INSERT OR UPDATE ON public.customer_addresses
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_default_address_to_customers();
