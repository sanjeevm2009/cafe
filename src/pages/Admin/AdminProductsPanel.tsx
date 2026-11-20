import { useEffect, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiRequest, formatEur } from '../../services/api';
import { EditorialImage } from '../../components/common/EditorialImage';
import type { Category, Product } from '../../types';

export function AdminProductsPanel() {
  const { pushToast } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceEur, setPriceEur] = useState('8.50');
  const [weight, setWeight] = useState('800 g');
  const [stock, setStock] = useState('15');
  const [description, setDescription] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [allergensText, setAllergensText] = useState('Gluten (Wheat)');
  const [imageUrl, setImageUrl] = useState('/src/assets/images/product_country_sourdough_1795207472437.jpg');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  // Category creation state
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const loadAll = async () => {
    try {
      setLoading(true);
      const [pRes, cRes] = await Promise.all([
        apiRequest<{ products: Product[] }>('/api/products?includeUnavailable=true'),
        apiRequest<{ categories: Category[] }>('/api/categories'),
      ]);
      setProducts(pRes.products);
      setCategories(cRes.categories);
      if (!categoryId && cRes.categories[0]) setCategoryId(cRes.categories[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const populateForm = (p: Product | null) => {
    setEditing(p);
    if (p) {
      setShowCreate(true);
      setName(p.name);
      setSlug(p.slug);
      setCategoryId(p.categoryId);
      setPriceEur((p.priceCents / 100).toFixed(2));
      setWeight(p.weight);
      setStock(String(p.stock));
      setDescription(p.description);
      setIngredientsText(p.ingredients.join(', '));
      setAllergensText(p.allergens.join(', '));
      setImageUrl(p.imageUrls[0] || '');
      setIsAvailable(p.isAvailable);
      setIsFeatured(p.isFeatured);
    } else {
      setShowCreate(true);
      setName('');
      setSlug('');
      setPriceEur('8.50');
      setWeight('800 g');
      setStock('15');
      setDescription('');
      setIngredientsText('Touraine T80 wheat flour, Spring water, 110-year liquid levain, Guérande sea salt');
      setAllergensText('Gluten (Wheat)');
      setImageUrl('/src/assets/images/product_country_sourdough_1795207472437.jpg');
      setIsAvailable(true);
      setIsFeatured(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const res = await apiRequest<{ url: string }>('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
        rawBody: true,
      });
      setImageUrl(res.url);
      pushToast('success', 'Image uploaded securely.');
    } catch (err: any) {
      pushToast('error', err.message || 'Image upload failed.');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      categoryId,
      priceCents: Math.round(Number(priceEur) * 100),
      weight,
      stock: Number(stock),
      description,
      ingredients: ingredientsText.split(',').map((s) => s.trim()).filter(Boolean),
      allergens: allergensText.split(',').map((s) => s.trim()).filter(Boolean),
      imageUrls: [imageUrl],
      isAvailable,
      isFeatured,
    };

    try {
      if (editing) {
        await apiRequest(`/api/products/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        pushToast('success', 'Product updated on storefront.');
      } else {
        await apiRequest('/api/products', { method: 'POST', body: JSON.stringify(payload) });
        pushToast('success', 'New creation published to storefront.');
      }
      setShowCreate(false);
      setEditing(null);
      loadAll();
    } catch (err: any) {
      pushToast('error', err.message || 'Could not save product.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await apiRequest(`/api/products/${id}`, { method: 'DELETE' });
      pushToast('info', 'Product deleted.');
      loadAll();
    } catch (err: any) {
      pushToast('error', err.message || 'Could not delete product.');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: catName,
          slug: catSlug || catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          description: catDesc,
          imageUrl: '/src/assets/images/product_country_sourdough_1795207472437.jpg',
        }),
      });
      setCatName('');
      setCatSlug('');
      setCatDesc('');
      pushToast('success', 'Category added.');
      loadAll();
    } catch (err: any) {
      pushToast('error', err.message || 'Failed to add category.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-[#292722]">Products &amp; Categories</h2>
        <button
          type="button"
          onClick={() => populateForm(null)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em] hover:bg-[#69462D] cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Creation
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleSaveProduct} className="bg-white border border-[#E5DED3] p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5DED3]">
            <h3 className="font-serif text-2xl text-[#292722]">{editing ? `Edit: ${editing.name}` : 'New Bakery Creation'}</h3>
            <button type="button" onClick={() => setShowCreate(false)} className="text-xs uppercase tracking-widest text-[#81796D] cursor-pointer">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-[#81796D] mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border border-[#E5DED3] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-[#81796D] mb-1">Slug</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated-if-empty" className="w-full border border-[#E5DED3] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-[#81796D] mb-1">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full border border-[#E5DED3] px-3 py-2 text-sm bg-white">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-[#81796D] mb-1">Price (EUR)</label>
              <input type="number" step="0.01" min="0.50" value={priceEur} onChange={(e) => setPriceEur(e.target.value)} required className="w-full border border-[#E5DED3] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-[#81796D] mb-1">Weight</label>
              <input value={weight} onChange={(e) => setWeight(e.target.value)} required className="w-full border border-[#E5DED3] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-[#81796D] mb-1">Stock</label>
              <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} required className="w-full border border-[#E5DED3] px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.14em] text-[#81796D] mb-1">Description</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required className="w-full border border-[#E5DED3] px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-[#81796D] mb-1">Ingredients (comma separated)</label>
              <input value={ingredientsText} onChange={(e) => setIngredientsText(e.target.value)} required className="w-full border border-[#E5DED3] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-[#81796D] mb-1">Allergens (comma separated)</label>
              <input value={allergensText} onChange={(e) => setAllergensText(e.target.value)} className="w-full border border-[#E5DED3] px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-[#81796D] mb-1">Image URL</label>
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} required className="w-full border border-[#E5DED3] px-3 py-2 text-sm" />
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2 border border-[#E5DED3] text-xs uppercase tracking-[0.14em] cursor-pointer w-fit hover:bg-[#F0EDE5]">
              <Upload className="w-4 h-4" /> Upload JPEG/PNG/WEBP
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
              <span>Available in Store</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              <span>Featured on Homepage</span>
            </label>
          </div>

          <button type="submit" className="px-7 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em] hover:bg-[#69462D] cursor-pointer">
            {editing ? 'Save Changes' : 'Create Product'}
          </button>
        </form>
      )}

      {/* Product Table */}
      <div className="bg-white border border-[#E5DED3] overflow-x-auto">
        {loading ? (
          <div className="p-8 text-sm text-[#81796D]">Loading catalogue...</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5DED3] bg-[#F8F6F1] text-[11px] uppercase tracking-[0.16em] text-[#81796D]">
              <tr>
                <th className="py-3.5 px-4">Creation</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Stock</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DED3]">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 px-4 flex items-center gap-3">
                    <EditorialImage src={p.imageUrls[0]} alt={p.name} className="w-11 h-11 object-cover border border-[#E5DED3] shrink-0" />
                    <div>
                      <p className="font-medium text-[#292722]">{p.name}</p>
                      <p className="text-xs text-[#81796D]">{p.weight}{p.isFeatured ? ' · Featured' : ''}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#81796D]">{p.categoryName}</td>
                  <td className="py-3 px-4 tabular-nums">{formatEur(p.priceCents)}</td>
                  <td className="py-3 px-4 tabular-nums">{p.stock}</td>
                  <td className="py-3 px-4 text-xs uppercase tracking-wider text-[#69462D]">
                    {p.isAvailable ? 'Active' : 'Hidden'}
                  </td>
                  <td className="py-3 px-4 text-right space-x-3">
                    <button type="button" onClick={() => populateForm(p)} className="text-xs uppercase tracking-wider text-[#8A6548] hover:underline cursor-pointer">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDeleteProduct(p.id)} aria-label={`Delete ${p.name}`} className="text-[#81796D] hover:text-[#69462D] cursor-pointer">
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Category Management */}
      <div className="bg-white border border-[#E5DED3] p-6 space-y-5">
        <h3 className="font-serif text-2xl text-[#292722]">Categories ({categories.length})</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((c) => (
            <div key={c.id} className="border border-[#E5DED3] p-4 bg-[#F8F6F1]">
              <p className="font-serif text-lg text-[#292722]">{c.name}</p>
              <p className="text-xs text-[#81796D] mt-1">{c.description}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleCreateCategory} className="pt-4 border-t border-[#E5DED3] grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input placeholder="New category name" value={catName} onChange={(e) => setCatName(e.target.value)} required className="border border-[#E5DED3] px-3 py-2 text-sm" />
          <input placeholder="slug (e.g. brioches)" value={catSlug} onChange={(e) => setCatSlug(e.target.value)} className="border border-[#E5DED3] px-3 py-2 text-sm" />
          <input placeholder="Short description" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} required className="border border-[#E5DED3] px-3 py-2 text-sm" />
          <button type="submit" className="px-4 py-2 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.14em] cursor-pointer">
            Add Category
          </button>
        </form>
      </div>
    </div>
  );
}
