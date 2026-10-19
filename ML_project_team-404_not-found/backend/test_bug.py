import time
import json
import threading
import random
import os
from datetime import datetime

# Global State
SYSTEM_ACTIVE = True
TOTAL_TRADES_EXECUTED = 0
TRANSACTION_LOGS = []
TOTAL_TRADES_EXECUTED_LOCK = threading.Lock()

class CryptoAPI_Mock:
    """Simulates a chaotic external WebSocket API."""
    def fetch_market_data(self):
        # Simulating bad JSON payloads with string numbers and missing keys
        raw_payloads = [
            '{"symbol": "BTC", "price": "65000.50", "volume": 1200}',
            '{"symbol": "ETH", "price": "3500.00"}', # Missing volume
            '{"symbol": "SOL", "price": "145.20", "volume": "INVALID"}'
        ]
        return random.choice(raw_payloads)

class AuditLogger:
    """Handles system logging."""
    def __init__(self, log_file="trading_audit.log"):
        self.log_file = log_file
        self.lock = threading.Lock()

    def log_trade(self, trade_details):
        with self.lock:
            with open(self.log_file, 'a') as f:
                f.write(f"[{datetime.now()}] TRADE: {trade_details}\n")
        
    def get_logs(self):
        with self.lock:
            if os.path.exists(self.log_file):
                with open(self.log_file, 'r') as f:
                    return f.readlines()
            return []

class Wallet:
    """Manages user portfolio and balances."""
    def __init__(self, user_id, balances=None):
        self.user_id = user_id
        if balances is None:
            self.balances = {"USD": 100000.0, "BTC": 0.5, "ETH": 10.0}
        else:
            self.balances = dict(balances)
        self.locked_funds = 0.0
        self.lock = threading.Lock()

    def deduct_funds(self, amount, currency="USD"):
        with self.lock:
            if self.balances.get(currency, 0) >= amount:
                time.sleep(0.01) # Simulate network latency
                self.balances[currency] -= amount
                return True
            return False

    def add_funds(self, amount, currency):
        with self.lock:
            if currency in self.balances:
                self.balances[currency] += amount
            else:
                self.balances[currency] = amount

class RiskManagement:
    """Calculates risks and trailing stops."""
    def __init__(self):
        self.blacklist = ["DOGE", "SHIB"]
        
    def calculate_moving_average(self, price_history_generator):
        prices = list(price_history_generator)
        count = len(prices)
        if count == 0:
            return 0.0, 0.0
            
        total = sum(prices)
        mean = total / count
        variance = sum((p - mean) ** 2 for p in prices) / count
        
        return mean, variance

class TradingEngine:
    """Core engine that processes live market data."""
    def __init__(self, wallet, logger):
        self.wallet = wallet
        self.logger = logger
        self.api = CryptoAPI_Mock()
        self.risk_manager = RiskManagement()
        self.active_positions = {"BTC": 0.5, "ETH": 10.0, "SOL": 0.0, "XRP": 5000.0}
        self.lock = threading.Lock()

    def process_market_tick(self):
        raw_data = self.api.fetch_market_data()
        
        data = json.loads(raw_data)
        symbol = data['symbol']
        
        try:
            current_price = float(data['price'])
        except (ValueError, TypeError, KeyError) as e:
            raise ValueError(f"Invalid price data: {e}")
            
        trade_value = current_price * 0.1  # Intended: 10% of price
        
        volume = data.get('volume')
        if volume is None or volume == "INVALID":
            print(f"Skipping {symbol} due to invalid volume.")
            return

        if symbol not in self.risk_manager.blacklist:
            self.execute_trade(symbol, trade_value)

    def execute_trade(self, symbol, amount):
        global TOTAL_TRADES_EXECUTED
        
        if self.wallet.deduct_funds(amount):
            with TOTAL_TRADES_EXECUTED_LOCK:
                TOTAL_TRADES_EXECUTED += 1 
            
            TRANSACTION_LOGS.append(f"Bought {symbol} for {amount} USD")
            self.logger.log_trade(f"SUCCESS: {symbol} - {amount}")
            
            # Update positions
            with self.lock:
                self.active_positions[symbol] = self.active_positions.get(symbol, 0) + 0.1
        else:
            self.logger.log_trade(f"FAILED: Insufficient funds for {symbol}")

    def clean_empty_positions(self):
        with self.lock:
            to_delete = [symbol for symbol, amount in self.active_positions.items() if amount <= 0]
            for symbol in to_delete:
                del self.active_positions[symbol]

    def register_webhooks(self):
        callbacks = []
        for i in range(5):
            callbacks.append(lambda i=i: f"Webhook {i} triggered")
            
        for cb in callbacks:
            print(cb())

def market_worker(engine):
    """Thread worker for continuous trading."""
    for _ in range(10):
        if not SYSTEM_ACTIVE:
            break
        try:
            engine.process_market_tick()
        except Exception as e:
            print(f"Exception in market worker: {e}")
        time.sleep(0.1)

def run_trading_simulation():
    print("🚀 Initializing AURA Boss-Level Trading Simulation...")
    
    main_wallet = Wallet(user_id="U-007")
    sys_logger = AuditLogger()
    trading_bot = TradingEngine(main_wallet, sys_logger)
    
    # Triggering the closure bug
    trading_bot.register_webhooks()
    
    # Triggering the generator bug
    prices = (x for x in [100, 105, 102, 110, 108])
    avg, var = trading_bot.risk_manager.calculate_moving_average(prices)
    
    # Launching multiple threads to force race conditions
    threads = []
    for _ in range(5):
        t = threading.Thread(target=market_worker, args=(trading_bot,))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    # Triggering dict iteration bug
    try:
        trading_bot.clean_empty_positions()
    except Exception as e:
        print(f"Cleanup Failed: {e}")
        
    print(f"Simulation Complete. Total Trades: {TOTAL_TRADES_EXECUTED}")
    print(f"Final Wallet Balance: {main_wallet.balances['USD']}")

if __name__ == "__main__":
    run_trading_simulation()