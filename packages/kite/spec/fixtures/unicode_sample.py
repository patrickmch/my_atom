from PIL import Image

class AddNumToPic(object):
    """ 第 0000 题：将你的 QQ 头像（或者微博头像）右上角加上红色的数字，
        类似于微信未读信息数量那种提示效果。 类似于图中效果
    """
    def __init__(self):
        self.img = None

    def open(self, img_path):
        self.img = Image.open(img_path)
        return True
