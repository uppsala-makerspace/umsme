import React, { useState } from "react";
import { LanguageSwitcher } from "../../components/LanguageSwitcher/langueSwitcher";
import { HamburgerMenu } from "../../components/HamburgerMenu/HamburgerMenu";
import { useTranslation } from "react-i18next";
import "./kiosk.css";

export const kiosk = () => {
  const { t } = useTranslation();

  const products = [
    { id: 1, nameKey: "Soda", price: 12 },
    { id: 2, nameKey: "Chips", price: 25 },
    { id: 3, nameKey: "ProteinBar", price: 15 },
    { id: 4, nameKey: "IceCream", price: 20 },
  ];

  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    const item = cart.find((item) => item.id === productId);
    if (!item) return;

    if (item.quantity > 1) {
      setCart(
        cart.map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      );
    } else {
      setCart(cart.filter((item) => item.id !== productId));
    }
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  return (
    <div className="umsapp kiosk-page">
      <div className="kiosk">
        <LanguageSwitcher />
        <HamburgerMenu />
        <h1>Kiosk</h1>

        <div className="products">
          <h2>{t("Products")}</h2>
          {products.map((product) => (
            <div key={product.id} className="product">
              <span>{t(product.nameKey)}</span>
              <span>{product.price} SEK</span>
              <button onClick={() => addToCart(product)}>
                {t("addToCart")}
              </button>
            </div>
          ))}
        </div>

        <div className="cart">
          <h2>{t("cart")}</h2>
          {cart.length === 0 ? (
            <p>{t("yourCartIsEmpty")}</p>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="cart-item">
                <span>
                  {t(item.nameKey)} x{item.quantity}
                </span>
                <span>{item.price * item.quantity} SEK</span>
                <button onClick={() => removeFromCart(item.id)}>
                  {t("removeOne")}
                </button>
              </div>
            ))
          )}
          <h3>
            {t("total")}: {calculateTotal()} SEK
          </h3>
        </div>
      </div>
    </div>
  );
};
