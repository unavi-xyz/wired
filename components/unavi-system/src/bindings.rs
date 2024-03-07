// Generated by `wit-bindgen` 0.20.0. DO NOT EDIT!
// Options used:
pub mod exports {
    pub mod wired {
        pub mod script {

            #[allow(clippy::all)]
            pub mod lifecycle {
                #[used]
                #[doc(hidden)]
                #[cfg(target_arch = "wasm32")]
                static __FORCE_SECTION_REF: fn() =
                    super::super::super::super::__link_custom_section_describing_imports;

                #[doc(hidden)]
                #[allow(non_snake_case)]
                pub unsafe fn _export_init_cabi<T: Guest>() {
                    T::init();
                }

                #[doc(hidden)]
                #[allow(non_snake_case)]
                pub unsafe fn _export_update_cabi<T: Guest>(arg0: f32) {
                    T::update(arg0);
                }

                #[doc(hidden)]
                #[allow(non_snake_case)]
                pub unsafe fn _export_cleanup_cabi<T: Guest>() {
                    T::cleanup();
                }
                pub trait Guest {
                    /// Called once when the script is loaded.
                    fn init();
                    /// Called every tick.
                    fn update(delta_seconds: f32);
                    /// Called once when the script is about to be unloaded.
                    fn cleanup();
                }
                #[doc(hidden)]

                macro_rules! __export_wired_script_lifecycle_cabi{
    ($ty:ident with_types_in $($path_to_types:tt)*) => (const _: () = {


      #[export_name = "wired:script/lifecycle#init"]
      unsafe extern "C" fn export_init() {
        $($path_to_types)*::_export_init_cabi::<$ty>()
      }

      #[export_name = "wired:script/lifecycle#update"]
      unsafe extern "C" fn export_update(arg0: f32,) {
        $($path_to_types)*::_export_update_cabi::<$ty>(arg0)
      }

      #[export_name = "wired:script/lifecycle#cleanup"]
      unsafe extern "C" fn export_cleanup() {
        $($path_to_types)*::_export_cleanup_cabi::<$ty>()
      }
    };);
  }
                #[doc(hidden)]
                pub(crate) use __export_wired_script_lifecycle_cabi;
            }
        }
    }
}

/// Generates `#[no_mangle]` functions to export the specified type as the
/// root implementation of all generated traits.
///
/// For more information see the documentation of `wit_bindgen::generate!`.
///
/// ```rust
/// # macro_rules! export{ ($($t:tt)*) => (); }
/// # trait Guest {}
/// struct MyType;
///
/// impl Guest for MyType {
///     // ...
/// }
///
/// export!(MyType);
/// ```
#[allow(unused_macros)]
#[doc(hidden)]

macro_rules! __export_system_impl {
  ($ty:ident) => (self::export!($ty with_types_in self););
  ($ty:ident with_types_in $($path_to_types_root:tt)*) => (
  $($path_to_types_root)*::exports::wired::script::lifecycle::__export_wired_script_lifecycle_cabi!($ty with_types_in $($path_to_types_root)*::exports::wired::script::lifecycle);
  )
}
#[doc(inline)]
pub(crate) use __export_system_impl as export;

#[cfg(target_arch = "wasm32")]
#[link_section = "component-type:wit-bindgen:0.20.0:system:encoded world"]
#[doc(hidden)]
pub static __WIT_BINDGEN_COMPONENT_TYPE: [u8; 241] = *b"\
\0asm\x0d\0\x01\0\0\x19\x16wit-component-encoding\x04\0\x07u\x01A\x02\x01A\x02\x01\
B\x05\x01@\0\x01\0\x04\0\x04init\x01\0\x01@\x01\x0ddelta-secondsv\x01\0\x04\0\x06\
update\x01\x01\x04\0\x07cleanup\x01\0\x04\x01\x16wired:script/lifecycle\x05\0\x04\
\x01\x13unavi:system/system\x04\0\x0b\x0c\x01\0\x06system\x03\0\0\0G\x09producer\
s\x01\x0cprocessed-by\x02\x0dwit-component\x070.201.0\x10wit-bindgen-rust\x060.2\
0.0";

#[inline(never)]
#[doc(hidden)]
#[cfg(target_arch = "wasm32")]
pub fn __link_custom_section_describing_imports() {
    wit_bindgen_rt::maybe_link_cabi_realloc();
}
