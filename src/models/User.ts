import mongoose, {Model,Schema} from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends mongoose.Document {
    _userId:string;
    nome: string;
    email: string;
    senha: string;

    compareSenha(senhaUser: string): Promise<boolean>;
}

//schema
const UserSchema = new Schema<IUser>({
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, unique: true, lowercase: true },
    senha: { type: String, required: true },
});

//hash
UserSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) {
        return next(); 
        try{
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(this.senha, salt);
            this.senha = hash;
            next(); 
        }catch(error:any){
            next(error);
        }
    }   
})

//comparar senha
UserSchema.methods.compareSenha = async function (senhaUser: string): Promise<boolean> {
    return bcrypt.compare(senhaUser, this.senha);
};

//toMap //FromMap

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>
('User', UserSchema);
export default User;