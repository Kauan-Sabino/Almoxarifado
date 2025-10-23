import mongoose, { Schema, Document } from 'mongoose';

export interface Movement extends Document {
    productId: mongoose.Types.ObjectId;
    quantity: number;
    type: 'entry' | 'exit';
    date: Date;
    userId: mongoose.Types.ObjectId;
}

const movementSchema: Schema = new Schema({
    productId: { type: mongoose.Types.ObjectId, required: true, ref: 'Product' },
    quantity: { type: Number, required: true },
    type: { type: String, enum: ['entry', 'exit'], required: true },
    date: { type: Date, default: Date.now },
    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'User' }
});

const MovementModel = mongoose.model<Movement>('Movement', movementSchema);

export default MovementModel;