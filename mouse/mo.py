import win32api
import win32con
import pynput
import json
import os
import sys
import time, random, math
 
config_file_name = 'mo_conf.json'

def read_conf(file_path):
    with open(file_path, 'r+', encoding='utf8') as r:
        return json.loads(r.read())
 
if getattr(sys, 'frozen', False):
    config_file_path = os.path.dirname(sys.executable)
elif __file__:
    config_file_path = os.path.dirname(__file__)

kc = pynput.keyboard.Controller()
mc = pynput.mouse.Controller()

# 生成正态分布随机数的函数（使用Box-Muller变换）
def generate_normal_random(mean, stddev):
    # 生成两个均匀分布的随机数（0到1之间）
    u1 = random.random()
    u2 = random.random()
    # 使用Box-Muller变换转换成正态分布随机数
    z0 = math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)
    # 使用均值和标准差进行线性变换
    return round(mean + z0 * stddev)

# 生成指定范围内满足正态分布的随机数(95.00%概率不超过n，且不小于m)
def r(m, n):
    mean = (m + n) / 2
    sigma = (n - m) / (2 * 1.645)  # 1.645对应95%的概率
    generated_random = generate_normal_random(mean, sigma)
    while generated_random < m:
        generated_random = random.randint(m, n)
    return generated_random / 1000

def l_btn_pressed() -> bool:
    btn = btn_mapping[conf['btn']]
    print('Lisener...    KEY_BUTTON: ' + conf['btn'], end='                                     \r')
    return True if win32api.GetKeyState(btn) < 0 else False

""" conf = {
    't1_min': 140,
    't1_max': 163,
    't2_min': 20,
    't2_max': 40,
    'btn': 'x1'
} """

btn_mapping = {
    'right': win32con.VK_RBUTTON,
    'middle': win32con.VK_MBUTTON,
    'x1': win32con.VK_XBUTTON1,
    'x2': win32con.VK_XBUTTON2
}
conf = read_conf(os.path.join(config_file_path, config_file_name))
t1_min = conf['t1_min']
t1_max = conf['t1_max']
t2_min = conf['t2_min']
t2_max = conf['t2_max']

while True:
    # 检测鼠标左键是否被按下
    if l_btn_pressed():
        # kc.press('p')
        mc.press(pynput.mouse.Button.left)
        time.sleep(r(t1_min, t1_max))
        # kc.release('p')
        mc.release(pynput.mouse.Button.left)
        time.sleep(r(t2_min, t2_max))

