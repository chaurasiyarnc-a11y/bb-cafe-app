'use client';
import React, { useState, useMemo } from 'react';
import { db } from '../../lib/firebase'; // अपनी लोकेशन के अनुसार पाथ सेट करें
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { Plus, Trash, Edit, Eye, EyeOff, X, BookOpen, Search, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ADD_CATEGORIES = ["Special Pizza", "Special Thali", "Paneer Special", "Special Mix veg", "Fast Food", "Super Cool", "Indian Bread", "Special Rice"];

interface MenuTabProps {
  menu: any[];
  categories: any[];
}

export default function MenuTab({ menu, categories }: MenuTabProps) {
  // सर्च और यूआई स्टेट्स
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // नया डिश जोड़ने की इनपुट स्टेट्स
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("Special Pizza");
  const [newImage, setNewImage] = useState("");
  const [variantType, setVariantType] = useState<'none' | 'half_full' | 'plain_butter' | 'pizza_sizes'>('none');
  const [halfPrice, setHalfPrice] = useState("");
  const [fullPrice, setFullPrice] = useState("");
  const [priceSmall, setPriceSmall] = useState("");
  const [priceMedium, setPriceMedium] = useState("");
  const [priceLarge, setPriceLarge] = useState("");
  const [priceXL, setPriceXL] = useState("");

  // डिश एडिट करने की स्टेट्स
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editVariantType, setEditVariantType] = useState<'none' | 'half_full' | 'plain_butter' | 'pizza_sizes'>('none');
  const [editHalfPrice, setEditHalfPrice] = useState("");
  const [editFullPrice, setEditFullPrice] = useState("");
  const [editPriceSmall, setEditPriceSmall] = useState("");
  const [editPriceMedium, setEditPriceMedium] = useState("");
  const [editPriceLarge, setEditPriceLarge] = useState("");
  const [editPriceXL, setEditPriceXL] = useState("");

  // SOP रेसिपी की स्टेट्स
  const [sopProduct, setSopProduct] = useState<any>(null);
  const [sopRecipeText, setSopRecipeText] = useState("");

  const categoryOptions = categories.length > 0 
    ? categories.map(c => c.name)
    : ADD_CATEGORIES;

  // --- फ़िल्टर की हुई डिश सर्च लिस्ट ---
  const searchedMenu = useMemo(() => {
    if (!menuSearchQuery.trim()) return menu;
    return menu.filter(item => 
      String(item.name).toLowerCase().includes(menuSearchQuery.toLowerCase()) || 
      String(item.category).toLowerCase().includes(menuSearchQuery.toLowerCase())
    );
  }, [menu, menuSearchQuery]);

  // --- CRUD एक्शन्स (डेटाबेस राइट्स) ---

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCategory || !newImage) {
      return toast.error("Please fill all required fields!");
    }

    const exists = menu.some(item => String(item.name).toLowerCase().trim() === newName.toLowerCase().trim());
    if (exists) {
      return toast.error("यह डिश पहले से मेन्यू में मौजूद है!");
    }

    let productData: any = {
      name: newName,
      category: newCategory,
      image: newImage,
      isVisible: true
    };

    if (variantType === 'none') {
      if (!newPrice) return toast.error("Please enter price!");
      productData.price = Number(newPrice);
    } else if (variantType === 'half_full') {
      if (!halfPrice || !fullPrice) return toast.error("Please fill prices!");
      productData.variants = { half: Number(halfPrice), full: Number(fullPrice) };
      productData.price = Number(halfPrice);
    } else if (variantType === 'plain_butter') {
      if (!halfPrice || !fullPrice) return toast.error("Please fill prices!");
      productData.variants = { Plain: Number(halfPrice), Butter: Number(fullPrice) };
      productData.price = Number(halfPrice);
    } else if (variantType === 'pizza_sizes') {
      const pizzaVariants: any = {};
      if (priceSmall) pizzaVariants.Small = Number(priceSmall);
      if (priceMedium) pizzaVariants.Medium = Number(priceMedium);
      if (priceLarge) pizzaVariants.Large = Number(priceLarge);
      if (priceXL) pizzaVariants["Extra Large"] = Number(priceXL);

      if (Object.keys(pizzaVariants).length === 0) {
        return toast.error("Kam se kam ek size ki price dalna zaroori hai!");
      }

      productData.variants = pizzaVariants;
      const sortedPrices = Object.values(pizzaVariants).map(Number);
      productData.price = Math.min(...sortedPrices);
    }

    try {
      await addDoc(collection(db, "products"), productData);
      toast.success("New Item Added!");
      setNewName(""); setNewPrice(""); setNewImage(""); setVariantType('none');
      setHalfPrice(""); setFullPrice(""); setPriceSmall(""); setPriceMedium(""); setPriceLarge(""); setPriceXL("");
      setShowAddForm(false);
    } catch (error) {
      toast.error("Error adding product");
    }
  };

  const startEditing = (item: any) => {
    setShowAddForm(false);
    setEditingProduct(item);
    setEditName(item.name);
    setEditPrice(item.price || "");
    setEditCategory(item.category);
    setEditImage(item.image);
    if (item.variants) {
      const keys = Object.keys(item.variants);
      if (keys.includes('Small') || keys.includes('Medium') || keys.includes('Large') || keys.includes('Extra Large')) {
        setEditVariantType('pizza_sizes');
        setEditPriceSmall(item.variants.Small || "");
        setEditPriceMedium(item.variants.Medium || "");
        setEditPriceLarge(item.variants.Large || "");
        setEditPriceXL(item.variants["Extra Large"] || "");
      } else if (keys.includes('Plain')) {
        setEditVariantType('plain_butter');
        setEditHalfPrice(item.variants.Plain || "");
        setEditFullPrice(item.variants.Butter || "");
      } else {
        setEditVariantType('half_full');
        setEditHalfPrice(item.variants.half || "");
        setEditFullPrice(item.variants.full || "");
      }
    } else {
      setEditVariantType('none');
      setEditPriceSmall(""); setEditPriceMedium(""); setEditPriceLarge(""); setEditPriceXL("");
      setEditHalfPrice(""); setEditFullPrice("");
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editCategory || !editImage) {
      return toast.error("Please fill all fields!");
    }

    const exists = menu.some(item => 
      item.id !== editingProduct.id && 
      String(item.name).toLowerCase().trim() === editName.toLowerCase().trim()
    );
    if (exists) {
      return toast.error("इस नाम की डिश पहले से मेन्यू में मौजूद है!");
    }

    let updatedData: any = {
      name: editName,
      category: editCategory,
      image: editImage
    };

    if (editVariantType === 'half_full') {
      if (!editHalfPrice || !editFullPrice) return toast.error("Please enter both variant prices!");
      updatedData.variants = { half: Number(editHalfPrice), full: Number(editFullPrice) };
      updatedData.price = Number(editHalfPrice);
    } else if (editVariantType === 'plain_butter') {
      if (!editHalfPrice || !editFullPrice) return toast.error("Please enter both variant prices!");
      updatedData.variants = { Plain: Number(editHalfPrice), Butter: Number(editFullPrice) };
      updatedData.price = Number(editHalfPrice);
    } else if (editVariantType === 'pizza_sizes') {
      const pizzaVariants: any = {};
      if (editPriceSmall) pizzaVariants.Small = Number(editPriceSmall);
      if (editPriceMedium) pizzaVariants.Medium = Number(editPriceMedium);
      if (editPriceLarge) pizzaVariants.Large = Number(editPriceLarge);
      if (editPriceXL) pizzaVariants["Extra Large"] = Number(editPriceXL);

      if (Object.keys(pizzaVariants).length === 0) {
        return toast.error("Kam se kam ek size ki price dalna zaroori hai!");
      }

      updatedData.variants = pizzaVariants;
      const sortedPrices = Object.values(pizzaVariants).map(Number);
      updatedData.price = Math.min(...sortedPrices);
    } else {
      if (!editPrice) return toast.error("Please enter a price!");
      updatedData.price = Number(editPrice);
      updatedData.variants = null;
    }

    try {
      await updateDoc(doc(db, "products", editingProduct.id), updatedData);
      toast.success("Product Updated successfully!");
      setEditingProduct(null);
    } catch (e) {
      toast.error("Error updating product");
    }
  };

  const toggleItemVisibility = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "products", id), { isVisible: !currentStatus });
      toast.success("Visibility Updated");
    } catch (e) { toast.error("Error updating product"); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product permanently?")) {
      try {
        await deleteDoc(doc(db, "products", id));
        toast.success("Product Deleted permanently!");
      } catch (error) {
        toast.error("Error deleting product");
      }
    }
  };

  const handleBulkImport = async () => {
    if (!window.confirm("BUM BUM CAFE PDF ke items ko database mein add karein?")) return;
    toast.loading("Importing menu items...", { id: "import" });

    const data = [
      { name: "Special Tea (स्पेशल चाय)", category: "Fast Food", price: 15, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=300&q=80" },
      { name: "Cheese Corn Pizza", category: "Special Pizza", price: 80, variants: { Small: 80, Medium: 110, Large: 140, "Extra Large": 180 }, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80" }
    ];

    try {
      let importedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const matched = menu.find(m => String(m.name).toLowerCase().trim() === item.name.toLowerCase().trim());
        if (matched) {
          await updateDoc(doc(db, "products", matched.id), {
            price: item.price,
            category: item.category,
            image: item.image,
            variants: item.variants || null
          });
          skippedCount++;
        } else {
          await addDoc(collection(db, "products"), {
            ...item,
            isVisible: true
          });
          importedCount++;
        }
      }
      toast.dismiss("import");
      toast.success("Excel Import Success!");
    } catch (e) {
      toast.dismiss("import");
      toast.error("Error seeding PDF items");
    }
  };

  const handleMergeDuplicates = async () => {
    if (!window.confirm("क्या आप वाकई सभी डुप्लीकेट ऑइली आइटम्स को मर्ज करना चाहते हैं?")) return;
    toast.loading("Merging duplicates...", { id: "merge" });

    try {
      const nameMap = new Map<string, any[]>();
      menu.forEach(item => {
        const cleanName = String(item.name).toLowerCase().trim();
        if (!nameMap.has(cleanName)) {
          nameMap.set(cleanName, []);
        }
        nameMap.get(cleanName)!.push(item);
      });

      let mergedCount = 0;
      const entries = Array.from(nameMap.entries());

      for (let i = 0; i < entries.length; i++) {
        const [, items] = entries[i];
        if (items.length > 1) {
          const primaryItem = items[0];
          
          let mergedVariants = { ...(primaryItem.variants || {}) };
          items.slice(1).forEach(dup => {
            if (dup.variants) {
              mergedVariants = { ...mergedVariants, ...dup.variants };
            }
          });

          const updatePayload: any = {};
          if (Object.keys(mergedVariants).length > 0) {
            updatePayload.variants = mergedVariants;
          }

          await updateDoc(doc(db, "products", primaryItem.id), updatePayload);

          for (const dup of items.slice(1)) {
            await deleteDoc(doc(db, "products", dup.id));
          }

          mergedCount += (items.length - 1);
        }
      }

      toast.dismiss("merge");
      toast.success(`Deduplication complete! merged and removed ${mergedCount} duplicates.`);
    } catch (err) {
      toast.dismiss("merge");
      toast.error("Failed to merge duplicate items.");
    }
  };

  const handleSaveSopRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sopProduct) return;
    try {
      await updateDoc(doc(db, "products", sopProduct.id), {
        recipe: sopRecipeText
      });
      setSopProduct(null);
      toast.success("Recipe SOP Saved!");
    } catch (err) {
      toast.error("Failed to save recipe SOP.");
    }
  };

  const getAdminDisplayPrice = (itm: any) => {
    if (itm?.variants && typeof itm.variants === 'object') {
      const keys = Object.keys(itm.variants);
      const labels = [];
      if (itm.variants.Small !== undefined) labels.push(`S: ₹${itm.variants.Small}`);
      if (itm.variants.Medium !== undefined) labels.push(`M: ₹${itm.variants.Medium}`);
      if (itm.variants.Large !== undefined) labels.push(`L: ₹${itm.variants.Large}`);
      if (itm.variants["Extra Large"] !== undefined) labels.push(`XL: ₹${itm.variants["Extra Large"]}`);
      
      if (labels.length > 0) return labels.join(' | ');

      if (keys.includes('Plain')) {
        return `Plain: ₹${itm.variants.Plain} | Butter: ₹${itm.variants.Butter}`;
      } else {
        return `Half: ₹${itm.variants.half} | Full: ₹${itm.variants.full}`;
      }
    }
    return `₹${itm.price || 0}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <button onClick={handleBulkImport} type="button" className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl">
          📥 IMPORT ALL 80+ PDF MENU ITEMS
        </button>
        
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleMergeDuplicates} className="bg-indigo-700 hover:bg-indigo-800 text-white py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all">
            🔍 Merge Existing Duplicates
          </button>
          <button onClick={() => { setShowAddForm(!showAddForm); setEditingProduct(null); }} className="bg-orange-500/10 text-orange-500 border border-orange-500/20 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 hover:bg-orange-500/20 active:scale-95 transition-all uppercase">
            <Plus size={16}/> {showAddForm ? "CLOSE FORM" : "ADD NEW ITEM"}
          </button>
        </div>
      </div>

      {/* डिश सर्च बार */}
      <div className="sticky top-[73px] z-30 bg-[#050505]/95 backdrop-blur-md py-4 border-b border-white/5 rounded-b-3xl shadow-lg">
        <div className="relative group max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search item name or category..." 
            value={menuSearchQuery} 
            onChange={(e) => setMenuSearchQuery(e.target.value)}
            className="w-full bg-white text-black py-3 px-11 rounded-xl outline-none text-xs font-semibold"
          />
        </div>
      </div>

      {/* --- ADD NEW PRODUCT FORM --- */}
      {showAddForm && (
        <form onSubmit={handleAddProduct} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
          <h3 className="text-lg font-black text-orange-500 italic uppercase">Add Product Form</h3>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Item Name</label>
            <input type="text" placeholder="e.g., Cheese Corn Pizza" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white" required />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white cursor-pointer" required>
              {categoryOptions.filter(c => c !== "All" && c !== "DIY Pizza").map(cat => (
                <option key={cat} value={cat} className="bg-[#111]">{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Image URL</label>
            <input type="url" placeholder="Paste image url link..." value={newImage} onChange={(e) => setNewImage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white" required />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Portion Option Type</label>
            <select value={variantType} onChange={(e: any) => setVariantType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white cursor-pointer">
              <option value="none" className="bg-[#111]">None (Single Price)</option>
              <option value="half_full" className="bg-[#111]">Half / Full</option>
              <option value="plain_butter" className="bg-[#111]">Plain / Butter</option>
              <option value="pizza_sizes" className="bg-[#111]">Pizza Sizes</option>
            </select>
          </div>

          {variantType === 'none' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Price (₹)</label>
              <input type="number" placeholder="Item Price" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white" />
            </div>
          )}

          {(variantType === 'half_full' || variantType === 'plain_butter') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Half / Plain Price (₹)</label>
                <input type="number" placeholder="Price" value={halfPrice} onChange={(e) => setHalfPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Full / Butter Price (₹)</label>
                <input type="number" placeholder="Price" value={fullPrice} onChange={(e) => setFullPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white" />
              </div>
            </div>
          )}

          {variantType === 'pizza_sizes' && (
            <div className="space-y-3 bg-[#111]/40 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] text-orange-400 font-extrabold uppercase font-sans">Prices (Leave blank if unavailable):</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Small (₹)</label><input type="number" value={priceSmall} onChange={(e) => setPriceSmall(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-white text-xs font-bold" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Medium (₹)</label><input type="number" value={priceMedium} onChange={(e) => setPriceMedium(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-white text-xs font-bold" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-404 uppercase">Large (₹)</label><input type="number" value={priceLarge} onChange={(e) => setPriceLarge(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-white text-xs font-bold" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Extra Large (₹)</label><input type="number" value={priceXL} onChange={(e) => setPriceXL(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-white text-xs font-bold" /></div>
              </div>
            </div>
          )}

          <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Save Product</button>
        </form>
      )}

      {/* डिशेज की रेंडरिंग लिस्ट */}
      <div className="space-y-3 pt-2">
        {searchedMenu.length === 0 ? (
          <p className="text-center text-xs font-black uppercase text-gray-400 py-10">No matching dishes found...</p>
        ) : (
          searchedMenu.map((item) => (
            <div key={item.id} className="bg-white/[0.02] p-4 rounded-3xl border border-white/5 flex items-center gap-4 hover:bg-white/[0.04] transition-all">
              <img src={item.image} className="w-16 h-16 rounded-2xl object-cover opacity-80" alt={item.name} />
              <div className="flex-1">
                <h4 className="font-bold text-sm">{item.name}</h4>
                <p className="text-orange-500 font-black text-xs italic capitalize">{item.category}</p>
                <p className="text-orange-500 font-black text-sm mt-1">{getAdminDisplayPrice(item)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setSopProduct(item); setSopRecipeText(item.recipe || ""); }} 
                  className="p-3 bg-purple-500/10 text-purple-500 rounded-xl flex items-center gap-1.5"
                >
                  <BookOpen size={16}/> <span className="text-[10px] font-black">SOP</span>
                </button>
                <button onClick={() => startEditing(item)} className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Edit size={18}/></button>
                <button onClick={() => toggleItemVisibility(item.id, item.isVisible !== false)} className={`p-3 rounded-xl transition-all ${item.isVisible !== false ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {item.isVisible !== false ? <Eye size={18}/> : <EyeOff size={18}/>}
                </button>
                <button onClick={() => handleDeleteProduct(item.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl"><Trash size={18}/></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- OVERLAY EDIT DISH MODAL --- */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleUpdateProduct} className="bg-[#111] border-2 border-orange-500/50 p-6 rounded-[2.5rem] w-full max-w-lg relative max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <button type="button" onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 p-2.5 bg-white/5 text-gray-400 hover:text-white rounded-full"><X size={18}/></button>
            
            <div className="text-center pb-2 border-b border-white/5">
              <h3 className="text-xl font-black text-orange-500 italic uppercase">Edit Product Info</h3>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Item Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white focus:border-orange-500" required />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white focus:border-orange-500 cursor-pointer" required>
                {categoryOptions.filter(c => c !== "All" && c !== "DIY Pizza").map(cat => (
                  <option key={cat} value={cat} className="bg-[#111]">{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Image URL</label>
              <input type="url" value={editImage} onChange={(e) => setEditImage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white focus:border-orange-500" required />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-404 uppercase">Option Type</label>
              <select value={editVariantType} onChange={(e: any) => setEditVariantType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white focus:border-orange-500 cursor-pointer">
                <option value="none" className="bg-[#111]">None (Single Price)</option>
                <option value="half_full" className="bg-[#111]">Half / Full</option>
                <option value="plain_butter" className="bg-[#111]">Plain / Butter</option>
                <option value="pizza_sizes" className="bg-[#111]">Pizza Sizes</option>
              </select>
            </div>

            {editVariantType === 'none' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-404 uppercase">Price (₹)</label>
                <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white" />
              </div>
            )}

            {(editVariantType === 'half_full' || editVariantType === 'plain_butter') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Half / Plain (₹)</label><input type="number" value={editHalfPrice} onChange={(e) => setEditHalfPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Full / Butter (₹)</label><input type="number" value={editFullPrice} onChange={(e) => setEditFullPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold" /></div>
              </div>
            )}

            {editVariantType === 'pizza_sizes' && (
              <div className="space-y-3 bg-[#111]/40 p-4 rounded-2xl border border-white/5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-404 uppercase">Small Price</label><input type="number" value={editPriceSmall} onChange={(e) => setEditPriceSmall(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white" /></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-404 uppercase">Medium Price</label><input type="number" value={editPriceMedium} onChange={(e) => setEditPriceMedium(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white" /></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-404 uppercase">Large Price</label><input type="number" value={editPriceLarge} onChange={(e) => setEditPriceLarge(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white" /></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-404 uppercase">Extra Large</label><input type="number" value={editPriceXL} onChange={(e) => setEditPriceXL(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white" /></div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Update Item</button>
              <button type="button" onClick={() => setEditingProduct(null)} className="bg-white/5 text-gray-400 p-4 rounded-xl font-black text-xs uppercase">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* --- OVERLAY DIGITAL RECIPE GUIDE (SOP MODAL) --- */}
      {sopProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSaveSopRecipe} className="bg-[#111] border-2 border-orange-500/50 p-6 rounded-[2.5rem] w-full max-w-lg relative shadow-2xl space-y-4">
            <button 
              type="button" 
              onClick={() => setSopProduct(null)} 
              className="absolute top-4 right-4 p-2 bg-white/5 text-gray-400 hover:text-white rounded-full transition-all"
            >
              <X size={18}/>
            </button>
            <div className="text-center pb-2 border-b border-white/5">
              <h3 className="text-lg font-black text-orange-500 uppercase italic">Digital Cooking SOP Guide</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-0.5">Dish: {sopProduct.name}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Step-by-Step Cooking Instructions</label>
              <textarea 
                value={sopRecipeText} 
                onChange={(e) => setSopRecipeText(e.target.value)} 
                placeholder="Write down the detailed step-by-step recipe, quantity of ingredients..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-orange-500 text-xs font-bold text-white h-44 resize-none leading-relaxed"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-green-600 text-white p-3.5 rounded-xl font-black text-xs uppercase">Save SOP Guide</button>
              <button type="button" onClick={() => setSopProduct(null)} className="bg-white/5 text-gray-400 p-3.5 rounded-xl font-black text-xs uppercase">Close</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
