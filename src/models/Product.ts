import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  _productId: string;
  name: string;
  description: string;
  quantity: number;
  minimumStock: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  minimumStock: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// evita OverwriteModelError / server reloads in development
const Product = (mongoose.models && (mongoose.models.Product as mongoose.Model<IProduct>))
  || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;