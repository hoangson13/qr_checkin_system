import os

import qrcode

import dconfig

qr_dir = os.path.join(dconfig.config_object.DATA_DIR, "qr")
if not os.path.isdir(qr_dir):
    os.makedirs(qr_dir, exist_ok=True)


def gen_qr(user_id):
    img = qrcode.make(f"qr_code_user:{user_id}")
    filepath = f"{qr_dir}/{user_id}.png"
    img.save(filepath)
    return filepath
