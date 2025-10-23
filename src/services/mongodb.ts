import mongoose from 'mongoose';

const MongoUri = process.env.DATABASE_URL;

if (!MongoUri) {
  throw new Error('defina database no env.local');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conectada: null, promessa: null };
}

async function conectarMongo() {
  if (cached.conectada) {
    return cached.conectada;
  }

    if (!cached.promessa) {
        const aguarde ={bufferCommands:false};
    cached.promessa = mongoose.connect(MongoUri!, aguarde).then((mongoose) => {
        console.log('Conectado ao MongoDB');
        return mongoose;
    });
 }

 try{
    cached.conectada = await cached.promessa;
 }catch(erro){
    cached.promessa = null;
    throw erro;
 }
    return cached.conectada;
}

export { conectarMongo };