import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: productStock } = await api.get<Stock>(`stock/${productId}`)

      const product = cart.find(product => product.id === productId)
      
      let newCart = {} as Product[]

      if (product) { // Produto no carrinho
        if (product.amount + 1 > productStock.amount) { // fora de estoque
          toast.error('Quantidade solicitada fora de estoque');
          return
        }

        const productIndex = cart.findIndex(product => product.id === productId)
        
        newCart = [
          ...cart.slice(0, productIndex),
          {
            ...product,
            amount: product.amount + 1
          }, 
          ...cart.slice(productIndex + 1)
        ]

      } else { // Produto não está no carrinho
        if(!productStock.amount) { // estoque zerado
          toast.error('Quantidade solicitada fora de estoque');
          return
        }

        const { data } = await api.get<Omit<Product, 'amount'>>(`products/${productId}`)
        
        newCart = [
          ...cart,
          {
            ...data,
            amount: 1            
          }
        ]
      }

      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
   
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId)

      if (!product) return

      const productIndex = cart.findIndex(product => product.id === productId)

      const newCart = [ 
        ...cart.slice(0, productIndex),
        {
          ...product,
          amount: product.amount - 1
        },
        ...cart.slice(productIndex + 1)
      ]

      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return
      
      const { data: productStock } = await api.get<Stock>(`stock/${productId}`)

      if (amount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const product = cart.find(product => product.id === productId)

      if (!product) return

      const productIndex = cart.findIndex(product => product.id === productId)

      const newCart = [ 
        ...cart.slice(0, productIndex),
        { ...product, amount },
        ...cart.slice(productIndex + 1)
      ]

      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
