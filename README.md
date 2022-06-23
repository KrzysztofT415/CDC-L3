## Specyfikacja

```bash
node --version # v17.8.0
ts-node --version # v10.7.0
npm modules:
    prompt@1.3.0

uname -srm # Linux 5.10.60.1-microsoft-standard-WSL2 x86_64
lsb_release -ds # Ubuntu 20.04.4 LTS
```

## Cel zadania

> Kodowanie i odkodowywanie plików z pomocą adaptacyjnego kodowania arytmetycznego ze skalowaniem i podawanie istotnych informacji.

## Uruchamianie

```
ts-node main.ts # otwiera interaktywny prompt
lub
ts-node main.ts [nazwa pliku wejściowego] [encode/decode] [tryb: omega/gamma/delta/fib] [nazwa pliku wyjściowego - opcjonalnie]
```

## Pliki

`main.ts` - kod programu do kodowania

`labor3.pdf` - zadanie

`test/*` - pliki do testów

`testing.sh` - skrypt powłoki do testowania kodowanie-dekodowanie plików z folderu test wszystkimi trybami
