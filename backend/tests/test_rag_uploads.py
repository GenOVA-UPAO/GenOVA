#!/usr/bin/env python3
"""
Test integration script for temporary uploads and RAG status.

Usage:
    python tests/test_rag_uploads.py
"""
import io
import os
import sys

try:
    import requests
except ImportError:
    print("Falta 'requests'. Instala con: pip install requests")
    sys.exit(1)

BASE = os.getenv("BASE", "http://localhost:8000")
EMAIL = os.getenv("EMAIL", "admin@genova.ai")
PASS = os.getenv("PASS", "admin1234password")


def auth() -> str:
    r = requests.post(
        f"{BASE}/api/auth/login",
        json={"email": EMAIL, "password": PASS},
        timeout=10,
    )
    r.raise_for_status()
    token = r.json().get("access_token") or r.json().get("token")
    if not token:
        raise ValueError(f"No access_token en respuesta: {r.json()}")
    return token


def main() -> None:
    print(f"Probando uploads RAG en: {BASE}")

    # 1. Auth
    try:
        token = auth()
        headers = {"Authorization": f"Bearer {token}"}
        print("[OK] Autenticacion exitosa.")
    except Exception as e:
        print(f"[FAIL] Fallo la autenticacion: {e}")
        print("Asegurate de que el backend este corriendo en el puerto 8000.")
        sys.exit(1)

    # 2. List initial uploads
    r_list = requests.get(f"{BASE}/api/uploads/temp", headers=headers, timeout=10)
    r_list.raise_for_status()
    initial_items = r_list.json().get("items", [])
    print(f"[OK] Archivos temporales iniciales: {len(initial_items)}")

    # 3. Perform a file upload (dummy PNG file)
    dummy_file_name = "test_rag_doc.png"
    dummy_file_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc` \x00\x00\x00\x02\x00\x01e\x81\n\x18\x00\x00\x00\x00IEND\xaeB`\x82"
    
    files = {
        "files": (dummy_file_name, io.BytesIO(dummy_file_bytes), "image/png")
    }
    
    print(f"Subiendo archivo de prueba '{dummy_file_name}'...")
    r_upload = requests.post(f"{BASE}/api/uploads/temp", headers=headers, files=files, timeout=15)
    r_upload.raise_for_status()
    
    upload_res = r_upload.json()
    items = upload_res.get("items", [])
    errors = upload_res.get("errors", [])
    
    if errors:
        print(f"[FAIL] Se detectaron errores al subir: {errors}")
        sys.exit(1)
        
    if not items:
        print("[FAIL] No se retornaron archivos en la respuesta exitosa.")
        sys.exit(1)
        
    uploaded_item = items[0]
    upload_id = uploaded_item.get("upload_id")
    rag_status = uploaded_item.get("rag_status")
    
    print("[OK] Archivo subido con exito:")
    print(f"  ID de Carga : {upload_id}")
    print(f"  Estado RAG  : {rag_status}")
    
    assert upload_id is not None, "El upload_id no debe ser nulo"
    assert rag_status is not None, "El rag_status no debe ser nulo"
    assert "status" in rag_status, "Debe haber una llave 'status' en rag_status"

    # 4. List uploads again to verify persistence of upload and RAG status
    r_list2 = requests.get(f"{BASE}/api/uploads/temp", headers=headers, timeout=10)
    r_list2.raise_for_status()
    current_items = r_list2.json().get("items", [])
    
    matching_items = [item for item in current_items if item.get("upload_id") == upload_id]
    if not matching_items:
        print(f"[FAIL] El archivo subido con ID {upload_id} no aparece en el endpoint de listado.")
        sys.exit(1)
        
    persisted_item = matching_items[0]
    print("[OK] El archivo aparece correctamente en el listado de archivos temporales.")
    print(f"  Estado RAG Persistido: {persisted_item.get('rag_status')}")
    
    assert persisted_item.get("rag_status") == rag_status, "El estado RAG no coincide en el listado"

    # 5. Delete the file
    print(f"Eliminando archivo de prueba con ID {upload_id}...")
    r_delete = requests.delete(f"{BASE}/api/uploads/temp/{upload_id}", headers=headers, timeout=10)
    r_delete.raise_for_status()
    print("[OK] Peticion de eliminacion exitosa.")

    # 6. Verify it is gone
    r_list3 = requests.get(f"{BASE}/api/uploads/temp", headers=headers, timeout=10)
    r_list3.raise_for_status()
    final_items = r_list3.json().get("items", [])
    
    remaining_matching = [item for item in final_items if item.get("upload_id") == upload_id]
    if remaining_matching:
        print(f"[FAIL] El archivo con ID {upload_id} aun existe despues de la eliminacion.")
        sys.exit(1)
        
    print("[OK] Archivo verificado como eliminado del listado temporal.")
    print("\n[OK] ¡Todos los tests de subida RAG y persistencia pasaron exitosamente!")


if __name__ == "__main__":
    main()
