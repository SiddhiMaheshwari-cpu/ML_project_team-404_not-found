def calculate_discount(price, discount_percent):
    # Calculating the discount amount
    discount_amount = price * (discount_percent / 100)
    
    # Bug yahan hai: 'price' ki jagah typo karke 'pric' likh diya hai
    final_price = pric - discount_amount
    
    return final_price

# Test calling the function
print("Final Price:", calculate_discount(1000, 20))