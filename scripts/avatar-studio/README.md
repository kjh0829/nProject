# 3D 캐릭터 제작 시안

Blender 4.3과 Pillow로 원화를 다시 만들 수 있다. `--blend`를 지정하면 코디별 컬렉션이 있는 편집용 장면도 저장한다. `--draft`는 카메라와 소재를 빠르게 검토하는 저해상도 출력이다.

```bash
blender -b --python-exit-code 1 --python scripts/avatar-studio/render.py -- --output /tmp/alchankki-renders --blend /tmp/alchankki.blend
python scripts/avatar-studio/pack.py /tmp/alchankki-renders docs/assets/avatar-studio
```

`render.py`에서 고정 카메라·자세·조명으로 복숭아빛 피부와 라일락 웨이브·산책 데님을 출력한다. 상의 두 가지, 모자 유무, 신발 두 가지를 검토한다. 모자 밑에 눌린 머리와 옷 위로 내려오는 머리카락까지 함께 그리기 위해 윗부분은 상의와 모자의 네 조합으로 저장한다. 발 부분은 신발 두 종류를 공유한다. `pack.py`는 같은 데님의 중간 구간에서 두 이미지의 색과 알파를 맞춘 후 잘라낸다. 웹은 선택한 윗부분과 발 부분을 한 Canvas에 그린다. 6개 투명 WebP로 8개 착장을 만든다. 테스트 페이지는 `docs/avatar-3d.html`이다.

새 상의와 하의를 추가할 때는 렌더의 카메라·자세를 유지하고, 잘라내는 줄까지 옷이 내려오거나 다리 윤곽이 바뀌는지 먼저 본다. 이번 시안은 고정 데님에 맞춰 구간을 나눴다. 치마나 긴 코트로 확대할 때는 옷의 깊이와 가림이 바뀌는 부위의 레이어를 별도로 설계해야 한다.
