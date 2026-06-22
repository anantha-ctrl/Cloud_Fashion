<?php
class AdminCategoryController
{
    public function store(array $p): void
    {
        Auth::admin();
        $data = Request::body();
        $v = Validator::make($data, ['name' => 'required|min:2|max:120']);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }
        $slug = self::slugify($data['name']);
        db()->prepare('INSERT INTO categories (name, slug, parent_id, image_url, description, is_active) VALUES (?,?,?,?,?,?)')
            ->execute([
                $data['name'], $slug, $data['parent_id'] ?? null,
                $data['image_url'] ?? null, $data['description'] ?? null,
                isset($data['is_active']) ? (int) $data['is_active'] : 1,
            ]);
        Response::success(['id' => (int) db()->lastInsertId(), 'slug' => $slug], 'Category created', 201);
    }

    public function update(array $p): void
    {
        Auth::admin();
        $data = Request::body();
        $id = (int) $p['id'];
        db()->prepare('UPDATE categories SET name=?, image_url=?, description=?, is_active=? WHERE id=?')
            ->execute([
                $data['name'], $data['image_url'] ?? null, $data['description'] ?? null,
                isset($data['is_active']) ? (int) $data['is_active'] : 1, $id,
            ]);
        Response::success(null, 'Category updated');
    }

    public function destroy(array $p): void
    {
        Auth::admin();
        db()->prepare('DELETE FROM categories WHERE id=?')->execute([(int) $p['id']]);
        Response::success(null, 'Category deleted');
    }

    public static function slugify(string $text): string
    {
        $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $text), '-'));
        return $slug . '-' . substr(uniqid(), -4);
    }
}
