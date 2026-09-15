# -*- coding: utf-8 -*-
"""디지타이저 HTML 을 굽는다: 템플릿 + Pretendard 글꼴(base64) + 버전.

    python tools/build_digitizer.py [템플릿.html] [출력.html]

기본값은 tools/digitizer_template.html -> docs/index.html.
홈페이지용 banner.svg 와 icon.svg 도 같은 폴더에 함께 굽는다. 버전은 tools/VERSION 한 곳.
"""
import base64, os, shutil, sys

TOOLS = os.path.dirname(os.path.abspath(__file__))


def main(tpl_path, out_path):
    version = open(os.path.join(TOOLS, "VERSION"), encoding="utf-8").read().strip()
    font = os.path.join(TOOLS, "PretendardVariable.woff2")
    if not os.path.isfile(font):
        raise SystemExit("글꼴 파일이 없습니다: %s (Pretendard Variable woff2, SIL OFL)" % font)

    sample = os.path.join(os.path.dirname(TOOLS), "examples", "sample.png")
    if not os.path.isfile(sample):
        raise SystemExit("예제 그림이 없습니다: %s" % sample)

    tpl = open(tpl_path, encoding="utf-8").read()
    rep = {"__FONT__": base64.b64encode(open(font, "rb").read()).decode(),
           "__SAMPLE__": base64.b64encode(open(sample, "rb").read()).decode(),
           "__VERSION__": version}
    for k, v in rep.items():
        assert k in tpl, k
        tpl = tpl.replace(k, v)           # __VERSION__ 은 여러 곳에 있다 — 전부 바꾼다
    assert not any(k in tpl for k in rep)

    out_dir = os.path.dirname(os.path.abspath(out_path))
    os.makedirs(out_dir, exist_ok=True)
    open(out_path, "w", encoding="utf-8").write(tpl)
    print("wrote", out_path, "%.2f MB  (v%s)" % (os.path.getsize(out_path) / 1e6, version))

    # 홈페이지 배너·아이콘: 버전 태그는 오른쪽 위, 글자 수로 폭을 잡는다.
    banner = open(os.path.join(TOOLS, "banner_template.svg"), encoding="utf-8").read()
    tag_w = 16 + 7.0 * len("v" + version)
    tag_x = 360 - 6 - 14 - tag_w
    for k, v in {"__VERSION__": version, "__TAGW__": "%.1f" % tag_w, "__TAGX__": "%.1f" % tag_x,
                 "__TAGCX__": "%.1f" % (tag_x + tag_w / 2)}.items():
        assert k in banner, k
        banner = banner.replace(k, v)
    assert "__" not in banner, "배너에 채워지지 않은 자리표시자가 남았다"
    open(os.path.join(out_dir, "banner.svg"), "w", encoding="utf-8").write(banner)
    shutil.copy(os.path.join(TOOLS, "icon.svg"), os.path.join(out_dir, "icon.svg"))
    print("wrote", os.path.join(out_dir, "banner.svg"), "+ icon.svg")


if __name__ == "__main__":
    root = os.path.dirname(TOOLS)
    tpl = sys.argv[1] if len(sys.argv) > 1 else os.path.join(TOOLS, "digitizer_template.html")
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, "docs", "index.html")
    main(tpl, out)
