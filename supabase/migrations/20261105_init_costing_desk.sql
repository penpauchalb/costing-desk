-- COSTING DESK: Complete Universal Product Costing & HPP Management Schema
-- Supports PostgreSQL with Supabase Auth & Row Level Security (RLS)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'My Workspace',
    default_currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Product Groups
CREATE TABLE IF NOT EXISTS public.product_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Master Materials
CREATE TABLE IF NOT EXISTS public.master_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    purchase_unit VARCHAR(50) NOT NULL,
    purchase_price NUMERIC(15, 4) NOT NULL DEFAULT 0,
    consumption_unit VARCHAR(50) NOT NULL,
    conversion_factor NUMERIC(15, 6) NOT NULL DEFAULT 1.0,
    supplier VARCHAR(255),
    notes TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.product_groups(id) ON DELETE SET NULL, -- NULL indicates Ungrouped Product
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    description TEXT,
    production_batch VARCHAR(100),
    production_date DATE,
    notes TEXT,
    is_draft BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Product Variants
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Standard',
    sku VARCHAR(100),
    size_weight_volume NUMERIC(15, 4),
    measurement_unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
    planned_quantity INT NOT NULL DEFAULT 100,
    actual_quantity INT,
    target_finished_quantity INT,
    wastage_percentage NUMERIC(5, 2) DEFAULT 0,
    defective_quantity INT DEFAULT 0,
    rework_quantity INT DEFAULT 0,
    yield_percentage NUMERIC(5, 2) DEFAULT 100,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Bill of Materials (BOM) Components
CREATE TABLE IF NOT EXISTS public.bom_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.master_materials(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'raw_materials',
    quantity_required NUMERIC(15, 6) NOT NULL DEFAULT 1,
    unit VARCHAR(50) NOT NULL,
    unit_price NUMERIC(15, 4) NOT NULL DEFAULT 0,
    cost_basis VARCHAR(50) NOT NULL DEFAULT 'per_finished_unit',
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed', -- confirmed, pending, blank
    notes TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Production Process Stages (Labor & Services)
CREATE TABLE IF NOT EXISTS public.production_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    stage_name VARCHAR(255) NOT NULL,
    cost_method VARCHAR(50) NOT NULL DEFAULT 'per_unit',
    rate NUMERIC(15, 4) NOT NULL DEFAULT 0,
    worker_count INT DEFAULT 1,
    hours_worked NUMERIC(10, 2) DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Overhead Items
CREATE TABLE IF NOT EXISTS public.overhead_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    allocation_method VARCHAR(50) NOT NULL DEFAULT 'fixed_per_batch',
    amount NUMERIC(15, 4) NOT NULL DEFAULT 0,
    percentage_basis VARCHAR(50),
    is_direct BOOLEAN DEFAULT false,
    include_in_hpp BOOLEAN DEFAULT true,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Production Batches (Historical Finalized Calculations)
CREATE TABLE IF NOT EXISTS public.production_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    variant_name VARCHAR(255) NOT NULL,
    planned_quantity INT NOT NULL,
    actual_finished_quantity INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'finalized',
    finalized_at TIMESTAMPTZ DEFAULT NOW(),
    price_snapshots JSONB NOT NULL DEFAULT '[]'::jsonb, -- Preserved historical material prices
    total_production_cost NUMERIC(15, 4) NOT NULL,
    unit_hpp NUMERIC(15, 4) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Scenarios (What-if simulations)
CREATE TABLE IF NOT EXISTS public.scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    simulated_quantity INT NOT NULL DEFAULT 500,
    material_price_adjustment_percent NUMERIC(6, 2) DEFAULT 0,
    packaging_price_adjustment_percent NUMERIC(6, 2) DEFAULT 0,
    labor_adjustment_percent NUMERIC(6, 2) DEFAULT 0,
    overhead_adjustment_percent NUMERIC(6, 2) DEFAULT 0,
    wastage_percentage NUMERIC(6, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overhead_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS Policies
CREATE POLICY "Users can manage workspaces" ON public.workspaces FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage groups" ON public.product_groups FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage materials" ON public.master_materials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage products" ON public.products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage variants" ON public.product_variants FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage bom" ON public.bom_components FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage processes" ON public.production_processes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage overhead" ON public.overhead_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage batches" ON public.production_batches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage scenarios" ON public.scenarios FOR ALL USING (auth.uid() = user_id);
