-- 1. Add columns to `products` table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS rating_score NUMERIC(3, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS favorite_count INTEGER DEFAULT 0;

-- 2. Create function to update rating_score and total_ratings
CREATE OR REPLACE FUNCTION public.update_product_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- If inserting or updating
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.target_type = 'product' THEN
      UPDATE products
      SET 
        rating_score = (
          SELECT COALESCE(AVG(rating), 0)
          FROM ratings
          WHERE target_type = 'product' AND target_id = NEW.target_id
        ),
        total_ratings = (
          SELECT COUNT(*)
          FROM ratings
          WHERE target_type = 'product' AND target_id = NEW.target_id
        )
      WHERE id = NEW.target_id;
    END IF;
  END IF;

  -- If deleting
  IF (TG_OP = 'DELETE') THEN
    IF OLD.target_type = 'product' THEN
      UPDATE products
      SET 
        rating_score = (
          SELECT COALESCE(AVG(rating), 0)
          FROM ratings
          WHERE target_type = 'product' AND target_id = OLD.target_id
        ),
        total_ratings = (
          SELECT COUNT(*)
          FROM ratings
          WHERE target_type = 'product' AND target_id = OLD.target_id
        )
      WHERE id = OLD.target_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger for ratings
DROP TRIGGER IF EXISTS trg_update_product_rating_stats ON ratings;
CREATE TRIGGER trg_update_product_rating_stats
AFTER INSERT OR UPDATE OR DELETE ON ratings
FOR EACH ROW
EXECUTE FUNCTION update_product_rating_stats();


-- 4. Create function to update favorite_count
CREATE OR REPLACE FUNCTION public.update_product_favorite_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- If inserting
  IF (TG_OP = 'INSERT') THEN
    UPDATE products
    SET favorite_count = (
      SELECT COUNT(*)
      FROM favorite_products
      WHERE product_id = NEW.product_id
    )
    WHERE id = NEW.product_id;
  END IF;

  -- If deleting
  IF (TG_OP = 'DELETE') THEN
    UPDATE products
    SET favorite_count = (
      SELECT COUNT(*)
      FROM favorite_products
      WHERE product_id = OLD.product_id
    )
    WHERE id = OLD.product_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger for favorite_products
DROP TRIGGER IF EXISTS trg_update_product_favorite_stats ON favorite_products;
CREATE TRIGGER trg_update_product_favorite_stats
AFTER INSERT OR DELETE ON favorite_products
FOR EACH ROW
EXECUTE FUNCTION update_product_favorite_stats();


-- 6. Recalculate existing data (Optional but recommended)
UPDATE products p
SET 
  rating_score = COALESCE((
    SELECT AVG(rating)
    FROM ratings
    WHERE target_type = 'product' AND target_id = p.id
  ), 0),
  total_ratings = COALESCE((
    SELECT COUNT(*)
    FROM ratings
    WHERE target_type = 'product' AND target_id = p.id
  ), 0),
  favorite_count = COALESCE((
    SELECT COUNT(*)
    FROM favorite_products
    WHERE product_id = p.id
  ), 0);
